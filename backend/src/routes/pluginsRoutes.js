import express from 'express';
import { PluginsController } from '../controllers/pluginsController.js';
import { PluginManagerService } from '../services/pluginManagerService.js';

const router = express.Router();

// UI Registry Endpoint for Frontend
router.get('/ui', PluginsController.getUIRegistry);

// Plugin Management Endpoints
router.get('/', PluginsController.listPlugins);
router.post('/:id/reload', PluginsController.reloadPlugin);

// Plugin Static Assets (For iframes, widgets, pages)
router.get('/assets/:id/:assetPath(*)', PluginsController.serveStatic);

// Mount Dynamic API Routes registered by Plugins
// Note: We use a middleware to always get the latest router in case of hot reloads
router.use('/', (req, res, next) => {
    const dynamicRouter = PluginManagerService.getApiRouter();
    dynamicRouter(req, res, next);
});

export default router;
