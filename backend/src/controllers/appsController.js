import { PM2Service } from '../services/pm2Service.js';
import { GitService } from '../services/gitService.js';
import { NginxService } from '../services/nginxService.js';
import EventBus from '../services/eventBus.js';
import { DeploymentService } from '../services/deploymentService.js';
import { JobQueueService } from '../services/jobQueueService.js';
import { SecurityService } from '../services/securityService.js';
import db from '../repositories/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appsDir = path.resolve(__dirname, '../../../../apps');

export class AppsController {
    static async listApps(req, res) {
        try {
            const apps = db.prepare('SELECT * FROM apps').all();
            
            // Sync with PM2 status
            try {
                const pm2List = await PM2Service.list();
                const pm2Map = {};
                pm2List.forEach(p => pm2Map[p.name] = p.pm2_env.status);
                
                apps.forEach(app => {
                    app.pm2_status = pm2Map[app.pm2_name] || 'offline';
                    
                    // Decrypt environment variables for the UI
                    if (app.env_vars && app.env_vars.includes(':')) {
                        app.env_vars = SecurityService.decrypt(app.env_vars);
                    }
                });
            } catch (e) {
                console.error('[Apps] Could not fetch PM2 list:', e);
            }
            
            res.json(apps);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createApp(req, res) {
        const { name, gitRepo, branch = 'main', startScript = 'npm start' } = req.body;
        
        try {
            // Validation
            if (!name.match(/^[a-zA-Z0-9-_]+$/)) {
                return res.status(400).json({ error: 'Invalid app name' });
            }
            
            const existing = db.prepare('SELECT id FROM apps WHERE name = ?').get(name);
            if (existing) return res.status(400).json({ error: 'App name already exists' });

            // Git Clone
            if (gitRepo) {
                await GitService.cloneRepo(gitRepo, name, branch);
                
                // Try running npm install inside
                // In a real prod setup, we'd spawn a process here and stream logs
            } else {
                // Local folder
                const appPath = path.join(appsDir, name);
                fs.mkdirSync(appPath, { recursive: true });
            }
            
            const pm2Name = `pixelpanel-${name}`;
            
            // Insert to DB
            const stmt = db.prepare(`
                INSERT INTO apps (name, pm2_name, path, git_repo, branch, start_script) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(name, pm2Name, path.join(appsDir, name), gitRepo, branch, startScript);
            const appId = result.lastInsertRowid;
            
            // Provision an initial empty config so Nginx doesn't crash on boot. 
            // We pass the partial app object so NginxService can derive the sandbox user.
            const tempApp = { id: appId };
            await NginxService.generateConfig(name, `${name}.pixelpanel.local`, 3000, tempApp, true);
            
            EventBus.publish('app.created', { appId, name });
            res.json({ success: true, app: appId });
        } catch (error) {
            EventBus.publish('app.deploy.failed', { appName: req.body.name, error: error.message });
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteApp(req, res) {
        const { id } = req.params;
        try {
            const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
            if (!app) return res.status(404).json({ error: 'Not found' });

            // Stop in PM2
            try {
                await PM2Service.delete(app.pm2_name);
            } catch (e) { /* ignore if not running */ }
            
            // Delete files
            if (fs.existsSync(app.path)) {
                fs.rmSync(app.path, { recursive: true, force: true });
            }

            db.prepare('DELETE FROM apps WHERE id = ?').run(id);
            res.json({ success: true, message: 'App deleted' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async actionApp(req, res) {
        const { id, action } = req.params; // action = start, stop, restart
        try {
            const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
            if (!app) return res.status(404).json({ error: 'Not found' });

            if (action === 'start') {
                // Run npm install if package.json exists? For now just start
                await PM2Service.start({
                    name: app.pm2_name,
                    script: app.start_script,
                    cwd: app.path
                });
                db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('online', id);
            } else if (action === 'stop') {
                await PM2Service.stop(app.pm2_name);
                db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('stopped', id);
            } else if (action === 'restart') {
                await PM2Service.restart(app.pm2_name);
            } else {
                return res.status(400).json({ error: 'Invalid action' });
            }
            
            res.json({ success: true, message: `App ${action}ed successfully` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async saveEnvVars(req, res) {
        const { id } = req.params;
        const { env_vars } = req.body; // Expecting stringified JSON
        try {
            // Encrypt before saving to database
            const encryptedVars = SecurityService.encrypt(env_vars);
            
            const stmt = db.prepare(`UPDATE apps SET env_vars = ? WHERE id = ?`);
            stmt.run(encryptedVars, id);
            
            SecurityService.logAction('env_vars_updated', req.user?.username || 'admin', req.ip, `Updated environment variables for app ${id}`);
            
            res.json({ success: true, message: 'Environment variables encrypted and saved' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getGitHistory(req, res) {
        const { id } = req.params;
        try {
            const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
            if (!app) return res.status(404).json({ error: 'Not found' });
            if (!app.git_repo) return res.json([]); // No git history for local apps

            const history = await GitService.history(app.name, 10);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getDeployments(req, res) {
        const { id } = req.params;
        try {
            const deployments = db.prepare('SELECT * FROM deployments WHERE app_id = ? ORDER BY id DESC LIMIT 20').all(id);
            res.json(deployments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async triggerDeployment(req, res) {
        const { id } = req.params;
        try {
            // Queue deployment safely instead of executing immediately
            JobQueueService.enqueueDeploy(id);
            res.json({ success: true, message: 'Deployment queued successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async rollbackDeployment(req, res) {
        const { id, deploymentId } = req.params;
        try {
            await DeploymentService.rollback(id, deploymentId);
            res.json({ success: true, message: 'Rollback successful' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
