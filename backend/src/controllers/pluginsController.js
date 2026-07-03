import { PluginManagerService } from '../services/pluginManagerService.js';
import fs from 'fs';
import path from 'path';

export class PluginsController {
    /**
     * Endpoint for the frontend to fetch all registered UI extensions
     * Returns Sidebar Menus, Dashboard Widgets, etc.
     */
    static getUIRegistry(req, res) {
        try {
            const registry = PluginManagerService.getUIRegistry();
            res.json(registry);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Endpoint to list all installed plugins and their statuses.
     */
    static listPlugins(req, res) {
        try {
            const plugins = [];
            for (const [pluginId, plugin] of PluginManagerService.loadedPlugins.entries()) {
                plugins.push({
                    id: pluginId,
                    name: plugin.manifest.name,
                    version: plugin.manifest.version,
                    description: plugin.manifest.description,
                    status: 'active'
                });
            }
            res.json(plugins);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Trigger a Hot Reload of a specific plugin.
     */
    static reloadPlugin(req, res) {
        const { id } = req.params;
        try {
            PluginManagerService.reloadPlugin(id);
            res.json({ success: true, message: `Plugin ${id} reloaded successfully.` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Serve static assets for a plugin (e.g. iframe HTML for widgets/pages)
     */
    static serveStatic(req, res) {
        const { id, assetPath } = req.params;
        try {
            const pluginDir = path.join(PluginManagerService.pluginsDir, id);
            const absoluteAssetPath = path.normalize(path.join(pluginDir, 'public', assetPath || 'index.html'));

            // Prevent path traversal
            if (!absoluteAssetPath.startsWith(path.join(pluginDir, 'public'))) {
                return res.status(403).send('Forbidden');
            }

            if (fs.existsSync(absoluteAssetPath)) {
                res.sendFile(absoluteAssetPath);
            } else {
                res.status(404).send('Not Found');
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
