import { AgentGatewayService } from '../services/cluster/agentGatewayService.js';

export class RemoteController {
    // ==========================================
    // Remote PM2 Management
    // ==========================================

    /** GET /api/remote/:nodeId/pm2/list */
    static async pm2List(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:list', {});
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/pm2/start */
    static async pm2Start(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:start', req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/pm2/stop */
    static async pm2Stop(req, res) {
        try {
            const { name } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:stop', { name });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/pm2/restart */
    static async pm2Restart(req, res) {
        try {
            const { name } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:restart', { name });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/pm2/reload */
    static async pm2Reload(req, res) {
        try {
            const { name } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:reload', { name });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** GET /api/remote/:nodeId/pm2/:appName/logs */
    static async pm2Logs(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:logs', {
                name: req.params.appName,
                lines: parseInt(req.query.lines) || 100
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** GET /api/remote/:nodeId/pm2/:appName/metrics */
    static async pm2Metrics(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'pm2:metrics', {
                name: req.params.appName
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // Remote File Management
    // ==========================================

    /** GET /api/remote/:nodeId/files?path=/some/dir */
    static async filesList(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:list', {
                path: req.query.path || '/'
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** GET /api/remote/:nodeId/files/read?path=/some/file */
    static async filesRead(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:read', {
                path: req.query.path
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/write */
    static async filesWrite(req, res) {
        try {
            const { path, content } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:write', { path, content });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/delete */
    static async filesDelete(req, res) {
        try {
            const { path } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:delete', { path });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/rename */
    static async filesRename(req, res) {
        try {
            const { oldPath, newPath } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:rename', { oldPath, newPath });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/zip */
    static async filesZip(req, res) {
        try {
            const { sourcePath, outputPath } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:zip', { sourcePath, outputPath });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/extract */
    static async filesExtract(req, res) {
        try {
            const { archivePath, targetPath } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:extract', { archivePath, targetPath });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/permissions */
    static async filesPermissions(req, res) {
        try {
            const { path, mode } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:permissions', { path, mode });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/remote/:nodeId/files/upload */
    static async filesUpload(req, res) {
        try {
            const { path, content } = req.body; // base64 encoded content
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:write', {
                path,
                content: Buffer.from(content, 'base64').toString('utf-8')
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** GET /api/remote/:nodeId/files/download?path=/some/file */
    static async filesDownload(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'fs:read', {
                path: req.query.path
            });
            res.type('application/octet-stream').send(result.content);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // Remote Terminal
    // ==========================================

    /** POST /api/remote/:nodeId/terminal/spawn */
    static async terminalSpawn(req, res) {
        try {
            const { cols, rows } = req.body;
            const result = await AgentGatewayService.sendCommand(req.params.nodeId, 'terminal:spawn', {
                cols: cols || 80,
                rows: rows || 24
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
