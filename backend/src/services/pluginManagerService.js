import fs from 'fs';
import path from 'path';
import vm from 'vm';
import express from 'express';
import { PixelPanelSDK } from './pixelPanelSDK.js';

export class PluginManagerService {
    static pluginsDir = path.join(process.cwd(), 'plugins');
    static loadedPlugins = new Map(); // Map of pluginId -> { sdk, vmContext, manifest }

    /**
     * Initializes the Plugin Engine. Loads all plugins from the /plugins directory.
     */
    static init() {
        console.log('[PluginManager] Initializing Plugin Engine...');
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }

        const plugins = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const pluginId of plugins) {
            this.loadPlugin(pluginId);
        }
    }

    /**
     * Sandboxes and executes a third-party plugin using the Node.js `vm` module.
     */
    static loadPlugin(pluginId) {
        try {
            const pluginPath = path.join(this.pluginsDir, pluginId);
            const manifestPath = path.join(pluginPath, 'plugin.json');
            const entryPath = path.join(pluginPath, 'index.js');

            if (!fs.existsSync(manifestPath) || !fs.existsSync(entryPath)) {
                console.warn(`[PluginManager] Skipping ${pluginId}: Missing plugin.json or index.js`);
                return;
            }

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const sourceCode = fs.readFileSync(entryPath, 'utf8');

            console.log(`[PluginManager] Sandboxing and loading plugin: ${manifest.name} (v${manifest.version})`);

            // 1. Create a fresh SDK instance for this specific plugin
            const sdk = new PixelPanelSDK(pluginId, manifest.name);

            // 2. Define the Restricted Sandbox Context
            // We explicitly DO NOT inject `require`, `process`, `fs`, `child_process` etc.
            // Plugins can only interact with the system through our `sdk` object.
            const sandbox = {
                sdk: sdk,
                console: {
                    log: (...args) => console.log(`[Plugin: ${manifest.name}]`, ...args),
                    error: (...args) => console.error(`[Plugin: ${manifest.name}] ERROR:`, ...args),
                    warn: (...args) => console.warn(`[Plugin: ${manifest.name}] WARN:`, ...args)
                },
                setTimeout,
                clearTimeout,
                setInterval,
                clearInterval
            };

            // Compile the context
            vm.createContext(sandbox);

            // 3. Execute the third-party code securely inside the VM
            const script = new vm.Script(sourceCode);
            script.runInContext(sandbox, { timeout: 5000 }); // Prevent infinite loops crashing the server

            // 4. Save to registry
            this.loadedPlugins.set(pluginId, { sdk, manifest, sandbox });
            
            console.log(`[PluginManager] Plugin ${manifest.name} loaded successfully.`);

        } catch (error) {
            console.error(`[PluginManager] CRITICAL ERROR loading plugin ${pluginId}:`, error.message);
        }
    }

    /**
     * Hot-reloads a specific plugin.
     */
    static reloadPlugin(pluginId) {
        console.log(`[PluginManager] Hot-reloading plugin: ${pluginId}`);
        // In a real system, we'd unregister its Express routes.
        // Express doesn't make unregistering routes easy, but we can clear our internal map.
        this.loadedPlugins.delete(pluginId);
        this.loadPlugin(pluginId);
    }

    /**
     * Aggregates all UI elements registered by plugins to send to the Vue Frontend.
     */
    static getUIRegistry() {
        const registry = {
            sidebar: [],
            widgets: [],
            pages: [],
            marketplaceTemplates: []
        };

        for (const [pluginId, plugin] of this.loadedPlugins.entries()) {
            const pluginUI = plugin.sdk.ui._exportRegistry();
            if (pluginUI.sidebar) registry.sidebar.push(...pluginUI.sidebar.map(item => ({ ...item, pluginId })));
            if (pluginUI.widgets) registry.widgets.push(...pluginUI.widgets.map(item => ({ ...item, pluginId })));
            if (pluginUI.pages) registry.pages.push(...pluginUI.pages.map(item => ({ ...item, pluginId })));
            if (pluginUI.marketplaceTemplates) registry.marketplaceTemplates.push(...pluginUI.marketplaceTemplates.map(item => ({ ...item, pluginId })));
        }

        return registry;
    }

    /**
     * Returns the dynamic Express Router aggregating all plugin custom routes.
     */
    static getApiRouter() {
        // Express Router to hold all plugin routes
        const router = express.Router();
        
        for (const [pluginId, plugin] of this.loadedPlugins.entries()) {
            // Mount the plugin's internal router to /api/plugins/custom/{pluginId}
            router.use(`/custom/${pluginId}`, plugin.sdk._routes);
        }
        
        return router;
    }
}
