import EventBus from './eventBus.js';
import db from '../repositories/db.js';
import { JobQueueService } from './jobQueueService.js';
import express from 'express';

export class PixelPanelSDK {
    constructor(pluginId, pluginName) {
        this.pluginId = pluginId;
        this.pluginName = pluginName;
        
        // Private registry for this plugin
        this._routes = express.Router();
        this._ui = {
            sidebar: [],
            widgets: [],
            pages: []
        };
    }

    // -----------------------------------------------------
    // API Hooks
    // -----------------------------------------------------
    get api() {
        return {
            /**
             * Registers a new Express route accessible at /api/plugins/custom/{pluginId}/{path}
             */
            register: (method, path, handler) => {
                if (['get', 'post', 'put', 'delete'].includes(method.toLowerCase())) {
                    this._routes[method.toLowerCase()](path, handler);
                    console.log(`[Plugin SDK: ${this.pluginName}] Registered API: ${method.toUpperCase()} ${path}`);
                } else {
                    throw new Error(`Invalid method: ${method}`);
                }
            }
        };
    }

    // -----------------------------------------------------
    // UI Registry Hooks
    // -----------------------------------------------------
    get ui() {
        return {
            /**
             * Registers a new item in the frontend Sidebar Menu
             */
            registerSidebar: (title, icon, routeName, componentIframeUrl) => {
                this._ui.sidebar.push({ title, icon, routeName, componentIframeUrl });
                console.log(`[Plugin SDK: ${this.pluginName}] Registered Sidebar Menu: ${title}`);
            },
            /**
             * Registers a Dashboard Widget
             */
            registerWidget: (title, componentIframeUrl, size = 'medium') => {
                this._ui.widgets.push({ title, componentIframeUrl, size });
            },
            /**
             * Internal use only: exports the registry
             */
            _exportRegistry: () => this._ui
        };
    }

    // -----------------------------------------------------
    // Event & Notification Hooks
    // -----------------------------------------------------
    get events() {
        return {
            subscribe: (eventName, callback) => {
                EventBus.subscribe(eventName, async (data) => {
                    try { await callback(data); } catch (e) { console.error(`[Plugin SDK: ${this.pluginName}] Event Error on ${eventName}:`, e.message); }
                });
            },
            publish: (eventName, data) => {
                EventBus.publish(eventName, data);
            }
        };
    }

    // -----------------------------------------------------
    // Marketplace Hooks
    // -----------------------------------------------------
    get marketplace() {
        return {
            /**
             * Register a custom app template to the marketplace
             */
            registerTemplate: (templateObj) => {
                // Ensure array exists, then push
                this._ui.marketplaceTemplates = this._ui.marketplaceTemplates || [];
                this._ui.marketplaceTemplates.push(templateObj);
                console.log(`[Plugin SDK: ${this.pluginName}] Registered Marketplace Template: ${templateObj.name}`);
            }
        };
    }

    // -----------------------------------------------------
    // Database Hooks (Sandboxed)
    // -----------------------------------------------------
    get db() {
        return {
            /**
             * Allows plugins to execute safe, prepared SELECT statements
             */
            query: (sql, ...params) => {
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    return db.prepare(sql).all(...params);
                } else {
                    throw new Error('Plugins can only execute SELECT queries for security reasons.');
                }
            }
        };
    }

    // -----------------------------------------------------
    // Background Job Hooks
    // -----------------------------------------------------
    get jobs() {
        return {
            enqueue: (taskType, data) => {
                // In a real implementation, JobQueueService would have a generic queue.
                // We'll simulate it by logging for the plugin.
                console.log(`[Plugin SDK: ${this.pluginName}] Enqueued job: ${taskType}`);
                EventBus.publish('plugin.job.enqueued', { plugin: this.pluginName, taskType, data });
            }
        };
    }
}
