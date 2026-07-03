import { FilesService } from '../services/filesService.js';
import { GitService } from '../services/gitService.js';

export class FilesController {
    static async list(req, res) {
        const { appId } = req.params;
        const { path = '/' } = req.query;
        try {
            const files = await FilesService.listDirectory(appId, path);
            res.json(files);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async read(req, res) {
        const { appId } = req.params;
        const { path } = req.query;
        try {
            const content = await FilesService.readFile(appId, path);
            res.send(content);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async write(req, res) {
        const { appId } = req.params;
        const { path, content } = req.body;
        try {
            await FilesService.writeFile(appId, path, content);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        const { appId } = req.params;
        const { path } = req.body;
        try {
            await FilesService.deleteFile(appId, path);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async rename(req, res) {
        const { appId } = req.params;
        const { oldPath, newPath } = req.body;
        try {
            await FilesService.renameFile(appId, oldPath, newPath);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async zip(req, res) {
        const { appId } = req.params;
        const { path, zipName } = req.body;
        try {
            await FilesService.compress(appId, path, zipName);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async extract(req, res) {
        const { appId } = req.params;
        const { zipPath, destPath } = req.body;
        try {
            await FilesService.extract(appId, zipPath, destPath);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async search(req, res) {
        const { appId } = req.params;
        const { query } = req.body;
        try {
            const results = await FilesService.search(appId, query);
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Git integration for IDE
    static async gitStatus(req, res) {
        const { appId } = req.params;
        try {
            const status = await GitService.status(appId);
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async gitDiff(req, res) {
        const { appId } = req.params;
        const { path } = req.query;
        try {
            const diff = await GitService.diff(appId, path);
            res.json({ diff });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async gitBlame(req, res) {
        const { appId } = req.params;
        const { path } = req.query;
        try {
            const blame = await GitService.blame(appId, path);
            res.json({ blame });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
