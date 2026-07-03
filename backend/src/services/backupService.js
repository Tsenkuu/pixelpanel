import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { SecurityService } from './securityService.js';

const execPromise = util.promisify(exec);

export class BackupService {
    static interval = null;

    /**
     * Start the automated backup daemon.
     * Backs up data daily.
     */
    static start() {
        console.log('[BackupService] Automated backup daemon started.');
        // Run daily (24 hours)
        this.interval = setInterval(() => this.runBackup(), 24 * 60 * 60 * 1000);
        
        const backupDir = path.resolve(process.cwd(), '../storage/backups');
        // Also run immediately on boot if no backup exists yet
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            this.runBackup();
        }
    }

    /**
     * Executes the backup process.
     */
    static async runBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `pixelpanel_backup_${timestamp}.tar.gz`;
        const backupDir = path.resolve(process.cwd(), '../storage/backups');
        const backupPath = path.join(backupDir, backupName);
        
        console.log(`[BackupService] Initiating automated backup: ${backupName}`);

        try {
            // Paths to backup
            const dbPath = path.resolve(process.cwd(), '../storage/pixelpanel.db');
            const nginxPath = '/etc/nginx/sites-available';
            const uploadPath = '/var/www/pixelpanel'; // Only uploads, no source code to save space
            
            // We use tar to compress. We skip source code since it's in Git anyway.
            // We backup DB, Nginx configs, and user uploads.
            
            let filesToBackup = '';
            if (fs.existsSync(dbPath)) filesToBackup += ` "${dbPath}"`;
            if (fs.existsSync(nginxPath)) filesToBackup += ` "${nginxPath}"`;
            if (fs.existsSync(uploadPath)) filesToBackup += ` "${uploadPath}"`;
            
            if (filesToBackup === '') {
                console.log('[BackupService] Nothing to backup.');
                return;
            }

            // Create archive without sudo to prevent password prompt hangs in PM2
            await execPromise(`tar -czf "${backupPath}" ${filesToBackup}`);
            
            // Secure the backup
            await execPromise(`chmod 600 "${backupPath}"`);

            console.log(`[BackupService] Backup completed successfully: ${backupPath}`);
            SecurityService.logAction('system_backup', 'system', '127.0.0.1', `Automated backup created: ${backupName}`);

            this.rotateBackups();
        } catch (error) {
            console.error(`[BackupService] Backup failed:`, error.message);
            SecurityService.logAction('system_backup_failed', 'system', '127.0.0.1', `Automated backup failed: ${error.message}`);
        }
    }

    /**
     * Keeps only the last 7 backups to prevent disk exhaustion.
     */
    static rotateBackups() {
        try {
            const dir = path.resolve(process.cwd(), '../storage/backups');
            if (!fs.existsSync(dir)) return;
            
            const files = fs.readdirSync(dir)
                .filter(f => f.startsWith('pixelpanel_backup_'))
                .map(f => ({ name: f, path: path.join(dir, f), time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time); // Newest first
            
            // Keep first 7, delete the rest
            if (files.length > 7) {
                const toDelete = files.slice(7);
                for (const file of toDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`[BackupService] Rotated (deleted) old backup: ${file.name}`);
                }
            }
        } catch (e) {
            console.error('[BackupService] Failed to rotate backups', e);
        }
    }
}
