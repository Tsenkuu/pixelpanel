import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class SandboxService {
    /**
     * Provisions an isolated Linux user for the given application ID.
     * Enforces strict permissions on the workspace directory.
     * @param {number|string} appId - The database ID of the app
     * @param {string} workspacePath - The path to the isolated application directory
     */
    static async provisionSandbox(appId, workspacePath) {
        const username = `pxl_app_${appId}`;
        
        console.log(`[SandboxService] Provisioning secure sandbox for user: ${username}`);
        
        try {
            // 1. Create the user if it doesn't exist.
            // -m creates a home dir (though we use workspacePath for code), -s /bin/bash for shell.
            // We use useradd and skip if user already exists
            try {
                await execPromise(`id -u ${username}`);
            } catch (err) {
                // User does not exist, create it
                await execPromise(`sudo useradd -m -s /bin/bash ${username}`);
            }

            // 2. Create the workspace directory if it doesn't exist
            if (!fs.existsSync(workspacePath)) {
                fs.mkdirSync(workspacePath, { recursive: true });
            }

            // 3. Create isolated logging and upload paths
            const logsPath = `/var/log/pixelpanel/${username}`;
            const uploadsPath = path.join(workspacePath, 'uploads');
            
            await execPromise(`sudo mkdir -p ${logsPath}`);
            await execPromise(`sudo mkdir -p ${uploadsPath}`);

            // 4. Force ownership to the isolated user
            await execPromise(`sudo chown -R ${username}:${username} "${workspacePath}"`);
            await execPromise(`sudo chown -R ${username}:${username} "${logsPath}"`);

            // 5. Enforce strict 700 permissions (only the owner can read/write/execute)
            // This prevents compromised apps from reading each other's .env files
            await execPromise(`sudo chmod -R 700 "${workspacePath}"`);
            await execPromise(`sudo chmod -R 700 "${logsPath}"`);

            console.log(`[SandboxService] Sandbox established securely for ${username}`);

            return {
                username,
                uid: username, // PM2 can accept username string directly for uid
                gid: username
            };
        } catch (error) {
            console.error(`[SandboxService] Sandbox provision failed:`, error.message);
            throw new Error(`Sandboxing failed: ${error.message}`);
        }
    }

    /**
     * Cleans up the sandbox user when an app is deleted.
     */
    static async destroySandbox(appId) {
        const username = `pxl_app_${appId}`;
        try {
            await execPromise(`sudo userdel -r ${username}`);
            console.log(`[SandboxService] User ${username} deleted.`);
        } catch (e) {
            console.log(`[SandboxService] Failed to delete user ${username}, might not exist.`);
        }
    }
}
