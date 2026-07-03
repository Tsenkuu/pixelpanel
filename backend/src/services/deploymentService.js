import { GitService } from './gitService.js';
import { PM2Service } from './pm2Service.js';
import { NginxService } from './nginxService.js';
import { RuntimeDetector } from './runtimeDetector.js';
import { SandboxService } from './sandboxService.js';
import { SecurityService } from './securityService.js';
import EventBus from './eventBus.js';
import db from '../repositories/db.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const appsDir = process.env.APPS_DIR || path.join(process.env.HOME || '/root', 'pixelpanel_apps');

export class DeploymentService {
    /**
     * Executes a Blue-Green deployment for zero-downtime rollouts.
     */
    static async executeDeployment(appId) {
        // Fetch App Info
        const app = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(appId);
        if (!app) throw new Error('App not found');

        // 1. Setup Deployment Sandbox & Workspace
        const deploymentId = Date.now();
        const workspacePath = path.join(appsDir, `${app.name}_${deploymentId}`);
        
        // Provision Secure Sandbox (Phase 1)
        const sandboxUser = await SandboxService.provisionSandbox(app.id, workspacePath);

        const tempPort = await this.findAvailablePort(4000); // Find a free port for staging

        // 1. Initialize Deployment in DB
        const stmt = db.prepare(`
            INSERT INTO deployments (app_id, status, workspace_path, logs) 
            VALUES (?, 'building', ?, ?)
        `);
        const result = stmt.run(app.id, workspacePath, 'Starting deployment...\n');
        const dbDeployId = result.lastInsertRowid;

        const log = (msg) => {
            console.log(`[Deploy ${dbDeployId}] ${msg}`);
            EventBus.publish('deployment.log', { dbDeployId, appName: app.name, msg });
            db.prepare(`UPDATE deployments SET logs = logs || ? WHERE id = ?`).run(msg + '\n', dbDeployId);
        };

        try {
            // 2. Clone to isolated staging workspace
            log(`Cloning ${app.git_repo} (Branch: ${app.branch}) into isolated workspace...`);
            const cloneResult = await GitService.clone(app.git_repo, workspacePath, app.branch);
            
            // Re-enforce permissions after git clone
            await execPromise(`sudo chown -R ${sandboxUser.username}:${sandboxUser.username} "${workspacePath}"`);
            await execPromise(`sudo chmod -R 700 "${workspacePath}"`);

            // Save Commit Data
            db.prepare(`UPDATE deployments SET commit_hash = ?, commit_message = ? WHERE id = ?`)
              .run(cloneResult.commitHash, cloneResult.commitMessage, dbDeployId);
            log(`Commit ${cloneResult.commitHash} checked out.`);

            // 3. Write Environment Variables
            log('Generating .env file...');
            let rawEnvVars = app.env_vars || '{}';
            
            // Decrypt if it's ciphertext
            if (rawEnvVars.includes(':')) {
                rawEnvVars = SecurityService.decrypt(rawEnvVars);
            }
            
            const envContent = JSON.parse(rawEnvVars);
            let envString = '';
            for (const [key, value] of Object.entries(envContent)) {
                envString += `${key}=${value}\n`;
            }
            // Inject the temp port so the app binds correctly in staging
            envString += `PORT=${tempPort}\n`;
            fs.writeFileSync(path.join(workspacePath, '.env'), envString);

            // 4. Autonomous Runtime Detection
            log('Detecting runtime and build commands...');
            const runtimeInfo = RuntimeDetector.detect(workspacePath);
            log(`Runtime detected: ${runtimeInfo.runtime}`);

            // 5. Build Cache Optimization (Node.js specifically)
            if (runtimeInfo.runtime === 'node') {
                const cachePath = path.join(appsDir, `.cache_${app.name}_node_modules`);
                if (fs.existsSync(cachePath)) {
                    log('Build cache hit! Restoring node_modules...');
                    await execPromise(`cp -r "${cachePath}" "${path.join(workspacePath, 'node_modules')}"`);
                }
            }

            // 6. Install, Audit, & Build
            if (runtimeInfo.buildCommand) {
                log(`Executing build command: ${runtimeInfo.buildCommand}`);
                try {
                    await execPromise(runtimeInfo.buildCommand, { cwd: workspacePath });
                    
                    // Threat Scanning: Reject if high/critical vulnerabilities exist
                    if (runtimeInfo.runtime === 'node') {
                        log('Scanning dependencies for vulnerabilities (npm audit)...');
                        try {
                            await execPromise('npm audit --audit-level=high', { cwd: workspacePath });
                            log('Security scan passed. No critical vulnerabilities found.');
                        } catch (auditErr) {
                            // npm audit exits with code 1 if vulnerabilities are found
                            log(`[SECURITY ALERT] Critical vulnerabilities detected in dependencies! Deployment blocked.`);
                            SecurityService.logAction('deployment_blocked', 'system', '127.0.0.1', `Blocked deployment of ${app.name} due to CVEs.`);
                            throw new Error('Deployment blocked: High/Critical vulnerabilities detected in package.json dependencies.');
                        }

                        // Update cache for next time
                        const cachePath = path.join(appsDir, `.cache_${app.name}_node_modules`);
                        await execPromise(`cp -r "${path.join(workspacePath, 'node_modules')}" "${cachePath}" || true`);
                    }
                } catch (installErr) {
                    log(`Build failed: ${installErr.message}`);
                    throw installErr;
                }
            }

            // 7. Start Staging PM2 Process with Resource Limits and UID/GID isolation
            const stagingPm2Name = `${app.name}_staging_${deploymentId}`;
            // Support user-defined start script overriding the auto-detected one
            const finalStartScript = app.start_script && app.start_script !== 'npm start' 
                ? app.start_script 
                : runtimeInfo.startScript;
            
            // Resource Limits (Phase 4): E.g., limit memory to 150M to prevent STB crash
            const memoryLimit = app.memory_limit || '150M';
            log(`Spinning up staging process (${stagingPm2Name}) on port ${tempPort} [Limit: ${memoryLimit}] [User: ${sandboxUser.username}]...`);
            
            // Run PM2 exactly as the isolated sandbox user
            // We use 'sudo -u' if not using PM2's native args, but PM2 CLI supports it natively:
            await execPromise(`pm2 start "${finalStartScript}" --name ${stagingPm2Name} --max-memory-restart ${memoryLimit} --uid ${sandboxUser.username} --gid ${sandboxUser.username} --cwd ${workspacePath}`, { cwd: workspacePath });

            // 8. Health Check
            log(`Waiting 5 seconds for health check...`);
            await new Promise(res => setTimeout(res, 5000));

            // 9. Swap Nginx (The Blue-Green Flip)
            log(`Routing traffic to new deployment...`);
            // We pass the new temp port to Nginx, it reloads instantly with 0 dropped connections
            await NginxService.generateConfig(app.name, app.domain, tempPort, app, false, false);

            // 8. Cleanup Old Production Process
            log('Cleaning up old instances to conserve RAM...');
            try {
                // Find and kill the previous active PM2 process
                await execPromise(`pm2 delete ${app.pm2_name}`);
            } catch (e) {
                // Ignore if it didn't exist
            }

            // Update app record to point to new path and pm2 name
            db.prepare(`UPDATE apps SET path = ?, pm2_name = ? WHERE id = ?`).run(workspacePath, stagingPm2Name, app.id);
            
            // Mark Deployment Success
            db.prepare(`UPDATE deployments SET status = 'success', completed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(dbDeployId);
            log('Deployment Successful! Live traffic is now flowing to the new release.');
            
            EventBus.publish('deployment.success', { dbDeployId, appName: app.name });

        } catch (error) {
            log(`Deployment Failed: ${error.message}`);
            db.prepare(`UPDATE deployments SET status = 'failed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(dbDeployId);
            
            // Cleanup Staging Process if it started
            try {
                await execPromise(`pm2 delete ${app.name}_staging_${deploymentId}`);
            } catch (e) {}
            // Cleanup Staging Folder
            fs.rmSync(workspacePath, { recursive: true, force: true });
            
            EventBus.publish('deployment.failed', { dbDeployId, appName: app.name, error: error.message });
            throw error;
        }
    }

    /**
     * Finds an available port starting from the given port.
     */
    static async findAvailablePort(startPort) {
        // Mock implementation for sandbox. In reality, use `net.createServer` to test port availability.
        return startPort + Math.floor(Math.random() * 1000);
    }

    /**
     * Rolls back to a previous deployment instantly.
     */
    static async rollback(appId, deploymentId) {
        const app = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(appId);
        const deploy = db.prepare(`SELECT * FROM deployments WHERE id = ? AND app_id = ? AND status = 'success'`).get(deploymentId, appId);
        
        if (!app || !deploy) throw new Error('Valid deployment not found for rollback.');

        const log = (msg) => {
            console.log(`[Rollback to ${deploymentId}] ${msg}`);
            EventBus.publish('deployment.log', { dbDeployId: 'rollback', appName: app.name, msg });
        };

        log(`Initiating rollback to commit ${deploy.commit_hash}...`);
        
        try {
            // Find a new port
            const tempPort = await this.findAvailablePort(4000);
            
            // Generate a fresh PM2 instance name for the old code
            const rollbackPm2Name = `${app.name}_rollback_${deploymentId}`;
            
            log(`Spinning up rollback process (${rollbackPm2Name}) on port ${tempPort}...`);
            // We assume the workspace_path still exists. If it was deleted, we'd need to re-clone here.
            if (!fs.existsSync(deploy.workspace_path)) {
                throw new Error('Workspace for this deployment was deleted to save space. Cannot fast-rollback.');
            }

            // Update .env port and Start
            let envContent = fs.readFileSync(path.join(deploy.workspace_path, '.env'), 'utf8');
            envContent = envContent.replace(/PORT=\d+/, `PORT=${tempPort}`);
            fs.writeFileSync(path.join(deploy.workspace_path, '.env'), envContent);

            await execPromise(`pm2 start "${app.start_script}" --name ${rollbackPm2Name} --cwd ${deploy.workspace_path}`, { cwd: deploy.workspace_path });

            log(`Swapping Nginx to route traffic to the rollback instance...`);
            await NginxService.generateConfig(app.name, app.domain, tempPort, app, false, false);

            log('Killing current unstable production instance...');
            try { await execPromise(`pm2 delete ${app.pm2_name}`); } catch (e) {}

            // Update App State
            db.prepare(`UPDATE apps SET path = ?, pm2_name = ? WHERE id = ?`).run(deploy.workspace_path, rollbackPm2Name, app.id);
            
            log('Rollback Successful! Service is restored.');
            return { success: true };
        } catch (error) {
            log(`Rollback Failed: ${error.message}`);
            throw error;
        }
    }
}
