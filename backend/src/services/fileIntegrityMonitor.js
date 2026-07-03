import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SecurityService } from './securityService.js';
import EventBus from './eventBus.js';

export class FileIntegrityMonitor {
    static interval = null;
    static baseline = new Map();
    
    // Core files to monitor for unexpected tampering
    static targetPaths = [
        '/etc/nginx/sites-available',
        '/etc/pixelpanel/master.key'
    ];

    /**
     * Start the File Integrity Monitor (FIM).
     */
    static start() {
        console.log('[FIM] File Integrity Monitor initialized.');
        
        // Build initial baseline
        this.scan(true);
        
        // Run scan every 5 minutes
        this.interval = setInterval(() => this.scan(false), 5 * 60 * 1000);
    }

    /**
     * Scans the target paths and calculates SHA-256 hashes.
     */
    static scan(isBaseline = false) {
        try {
            for (const targetPath of this.targetPaths) {
                if (!fs.existsSync(targetPath)) continue;
                
                const stats = fs.statSync(targetPath);
                
                if (stats.isDirectory()) {
                    const files = fs.readdirSync(targetPath);
                    for (const file of files) {
                        this.hashFile(path.join(targetPath, file), isBaseline);
                    }
                } else {
                    this.hashFile(targetPath, isBaseline);
                }
            }
        } catch (error) {
            console.error('[FIM] Scan error:', error.message);
        }
    }

    static hashFile(filePath, isBaseline) {
        try {
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            
            if (isBaseline) {
                this.baseline.set(filePath, hash);
            } else {
                const previousHash = this.baseline.get(filePath);
                
                if (!previousHash) {
                    // New file detected
                    console.log(`[FIM] Alert: New core system file detected - ${filePath}`);
                    SecurityService.logAction('fim_alert_new', 'system', '127.0.0.1', `New core file: ${filePath}`);
                    this.baseline.set(filePath, hash);
                } else if (previousHash !== hash) {
                    // Tampering detected
                    console.error(`[FIM] CRITICAL ALERT: File modification detected on ${filePath}`);
                    SecurityService.logAction('fim_alert_modified', 'system', '127.0.0.1', `Core file tampered: ${filePath}`);
                    
                    // Alert the AI Proactive Service via EventBus
                    EventBus.publish('security.fim.breach', { filePath, hash, previousHash });
                    
                    // Update baseline so we don't spam
                    this.baseline.set(filePath, hash);
                }
            }
        } catch (e) {
            // Might be deleted
            if (this.baseline.has(filePath)) {
                console.error(`[FIM] ALERT: Core file deleted - ${filePath}`);
                SecurityService.logAction('fim_alert_deleted', 'system', '127.0.0.1', `Core file deleted: ${filePath}`);
                this.baseline.delete(filePath);
            }
        }
    }
}
