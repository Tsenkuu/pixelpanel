import fs from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';
import db from '../repositories/db.js';

const execPromise = util.promisify(exec);

export class FilesService {
    /**
     * Resolves and strictly validates a file path to prevent path traversal attacks.
     * Ensures the target path is inside the app's workspace.
     */
    static resolveSecurePath(appId, targetPath) {
        const app = db.prepare('SELECT path FROM apps WHERE id = ?').get(appId);
        if (!app) throw new Error('App not found');

        const workspacePath = app.path;
        // Normalize the target path to remove any ../ or ./
        const absoluteTargetPath = path.normalize(path.join(workspacePath, targetPath || '/'));

        // Security Check: Ensure the absolute target path strictly starts with the workspace path
        if (!absoluteTargetPath.startsWith(workspacePath)) {
            throw new Error('SECURITY VIOLATION: Path traversal attempted.');
        }

        return {
            workspacePath,
            targetPath: absoluteTargetPath,
            sandboxUser: `pxl_app_${appId}`
        };
    }

    /**
     * List files in a directory natively as the sandbox user.
     */
    static async listDirectory(appId, dirPath) {
        const { targetPath, sandboxUser } = this.resolveSecurePath(appId, dirPath);

        // We could use fs.readdirSync if Node has permissions, but to be strictly 
        // safe with sandbox permissions, we run `ls` as the sandbox user.
        // Or we just rely on Node running as root (which it is), but formatting is easier via Node fs.
        // Wait, Node runs as root, so it CAN read anything. It just shouldn't WRITE as root.
        // Let's use Node fs for reading to keep it fast, but write using `sudo -u`.
        
        try {
            const files = fs.readdirSync(targetPath, { withFileTypes: true });
            return files.map(file => {
                const stat = fs.statSync(path.join(targetPath, file.name));
                return {
                    name: file.name,
                    path: path.relative(this.resolveSecurePath(appId, '/').targetPath, path.join(targetPath, file.name)),
                    isDirectory: file.isDirectory(),
                    size: stat.size,
                    modified: stat.mtime
                };
            }).sort((a, b) => {
                // Directories first
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
        } catch (e) {
            throw new Error(`Cannot list directory: ${e.message}`);
        }
    }

    /**
     * Reads a file.
     */
    static async readFile(appId, filePath) {
        const { targetPath } = this.resolveSecurePath(appId, filePath);
        
        // Fast Node.js read (we are root, we have access, no need for sudo -u cat)
        if (!fs.existsSync(targetPath)) throw new Error('File not found');
        return fs.readFileSync(targetPath, 'utf8');
    }

    /**
     * Writes to a file as the sandbox user.
     */
    static async writeFile(appId, filePath, content) {
        const { targetPath, sandboxUser } = this.resolveSecurePath(appId, filePath);
        
        // Since we are root, we can write directly via Node fs, but it would be owned by root!
        // So we write it, and then instantly chown it back to the sandbox user.
        // This is much faster than piping through `sudo -u`.
        
        // Make sure directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            await execPromise(`sudo chown -R ${sandboxUser}:${sandboxUser} "${dir}"`);
        }

        fs.writeFileSync(targetPath, content);
        await execPromise(`sudo chown ${sandboxUser}:${sandboxUser} "${targetPath}"`);
        
        return { success: true };
    }

    /**
     * Deletes a file or directory as the sandbox user.
     */
    static async deleteFile(appId, filePath) {
        const { targetPath, sandboxUser } = this.resolveSecurePath(appId, filePath);
        
        // Safety check: Don't let them delete the entire workspace root
        if (targetPath === this.resolveSecurePath(appId, '/').targetPath) {
            throw new Error('Cannot delete workspace root');
        }

        // Use sudo -u rm to enforce permissions safely, though Node fs.rmSync works too.
        await execPromise(`sudo -u ${sandboxUser} rm -rf "${targetPath}"`);
        return { success: true };
    }

    /**
     * Renames or moves a file.
     */
    static async renameFile(appId, oldPath, newPath) {
        const source = this.resolveSecurePath(appId, oldPath);
        const destination = this.resolveSecurePath(appId, newPath);
        
        await execPromise(`sudo -u ${source.sandboxUser} mv "${source.targetPath}" "${destination.targetPath}"`);
        return { success: true };
    }

    /**
     * Zips a folder/file.
     */
    static async compress(appId, sourcePath, zipName) {
        const { targetPath, sandboxUser, workspacePath } = this.resolveSecurePath(appId, sourcePath);
        const dest = this.resolveSecurePath(appId, zipName);

        // Run tar as the sandboxed user from within their workspace
        await execPromise(`sudo -u ${sandboxUser} tar -czf "${dest.targetPath}" -C "${path.dirname(targetPath)}" "${path.basename(targetPath)}"`, { cwd: workspacePath });
        return { success: true };
    }

    /**
     * Extracts a zip archive.
     */
    static async extract(appId, zipPath, destFolder) {
        const source = this.resolveSecurePath(appId, zipPath);
        const dest = this.resolveSecurePath(appId, destFolder);

        if (!fs.existsSync(dest.targetPath)) {
            fs.mkdirSync(dest.targetPath, { recursive: true });
            await execPromise(`sudo chown ${source.sandboxUser}:${source.sandboxUser} "${dest.targetPath}"`);
        }

        await execPromise(`sudo -u ${source.sandboxUser} tar -xzf "${source.targetPath}" -C "${dest.targetPath}"`);
        return { success: true };
    }

    /**
     * Performs a recursive string search across the workspace using ripgrep or grep.
     */
    static async search(appId, query) {
        const { targetPath, sandboxUser } = this.resolveSecurePath(appId, '/');
        
        try {
            // using standard grep natively as the sandbox user
            // -r recursive, -n line numbers, -I ignore binary, -i case insensitive
            const { stdout } = await execPromise(`sudo -u ${sandboxUser} grep -rnIi "${query}" "${targetPath}"`);
            
            const results = [];
            const lines = stdout.split('\n').filter(l => l.trim().length > 0);
            
            for (const line of lines) {
                // format: /path/to/file:line:content
                const match = line.match(/^(.*?):(\d+):(.*)$/);
                if (match) {
                    const fullPath = match[1];
                    const relPath = path.relative(targetPath, fullPath);
                    results.push({
                        file: relPath,
                        line: parseInt(match[2]),
                        content: match[3].trim()
                    });
                }
            }
            return results;
        } catch (e) {
            // grep exits with 1 if nothing found
            if (e.code === 1) return [];
            throw new Error('Search failed');
        }
    }
}
