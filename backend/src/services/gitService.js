import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appsDir = path.resolve(__dirname, '../../../../apps');

export class GitService {
    /**
     * Clone a repository
     */
    static async clone(repoUrl, targetPath, branch = 'main') {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        const git = simpleGit(targetPath);
        
        try {
            await git.clone(repoUrl, '.', ['-b', branch]);
            // Fetch the commit data immediately after clone
            const log = await git.log(['-n', '1']);
            return { 
                success: true, 
                commitHash: log.latest.hash,
                commitMessage: log.latest.message
            };
        } catch (error) {
            // Cleanup on failure
            fs.rmSync(targetPath, { recursive: true, force: true });
            console.error('[GitService] Clone failed:', error);
            throw new Error(`Git clone failed: ${error.message}`);
        }
    }

    /**
     * Pull latest changes
     */
    static async pull(targetPath, branch = 'main') {
        const git = simpleGit(targetPath);
        try {
            await git.pull('origin', branch);
            const log = await git.log(['-n', '1']);
            return { 
                success: true, 
                commitHash: log.latest.hash,
                commitMessage: log.latest.message
            };
        } catch (error) {
            console.error('[Git] Pull error:', error);
            throw new Error(`Git pull failed: ${error.message}`);
        }
    }

    /**
     * Get Commit History
     */
    static async history(appName, limit = 10) {
        const appPath = path.join(appsDir, appName);
        if (!fs.existsSync(appPath)) throw new Error('App directory does not exist');
        
        try {
            const git = simpleGit(appPath);
            const log = await git.log(['-n', limit.toString()]);
            return log.all;
        } catch (error) {
            console.error('[Git] History error:', error);
            throw new Error(`Failed to get history: ${error.message}`);
        }
    }

    /**
     * Checkout to a specific commit (Rollback)
     */
    static async rollback(appName, commitHash) {
        const appPath = path.join(appsDir, appName);
        if (!fs.existsSync(appPath)) throw new Error('App directory does not exist');
        
        try {
            const git = simpleGit(appPath);
            await git.checkout(commitHash);
            return { success: true, message: `Rolled back to ${commitHash}` };
        } catch (error) {
            console.error('[Git] Rollback error:', error);
            throw new Error(`Failed to rollback: ${error.message}`);
        }
    }

    /**
     * Get Git Status
     */
    static async status(appId) {
        // We require db to resolve path properly
        const { FilesService } = await import('./filesService.js');
        const { targetPath } = FilesService.resolveSecurePath(appId, '/');
        
        try {
            const git = simpleGit(targetPath);
            const status = await git.status();
            return status;
        } catch (error) {
            console.error('[Git] Status error:', error);
            throw new Error(`Git status failed: ${error.message}`);
        }
    }

    /**
     * Get Git Diff
     */
    static async diff(appId, filePath) {
        const { FilesService } = await import('./filesService.js');
        const { targetPath, workspacePath } = FilesService.resolveSecurePath(appId, filePath);
        
        try {
            const git = simpleGit(workspacePath);
            const relPath = path.relative(workspacePath, targetPath);
            const diff = await git.diff([relPath]);
            return diff;
        } catch (error) {
            console.error('[Git] Diff error:', error);
            throw new Error(`Git diff failed: ${error.message}`);
        }
    }

    /**
     * Get Git Blame
     */
    static async blame(appId, filePath) {
        const { FilesService } = await import('./filesService.js');
        const { targetPath, workspacePath } = FilesService.resolveSecurePath(appId, filePath);
        
        try {
            const git = simpleGit(workspacePath);
            const relPath = path.relative(workspacePath, targetPath);
            // simple-git doesn't have a direct blame method returning JSON easily, we use raw
            const result = await git.raw(['blame', '--line-porcelain', relPath]);
            return result;
        } catch (error) {
            console.error('[Git] Blame error:', error);
            throw new Error(`Git blame failed: ${error.message}`);
        }
    }
}
