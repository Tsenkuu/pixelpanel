import db from '../../repositories/db.js';
import EventBus from '../eventBus.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Manages cluster agent nodes - registration, authentication, heartbeat tracking,
 * and automatic offline detection.
 */
export class NodeRegistryService {
    /** @type {Map<string, Object>} In-memory cache of latest metrics per node */
    static metricsCache = new Map();

    /** @type {ReturnType<typeof setInterval>|null} */
    static _offlineTimer = null;

    /**
     * Initializes the node registry - creates the cluster_nodes table and
     * starts the offline detection loop.
     */
    static init() {
        db.exec(`
            CREATE TABLE IF NOT EXISTS cluster_nodes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                host TEXT NOT NULL,
                port INTEGER NOT NULL,
                token TEXT NOT NULL,
                status TEXT DEFAULT 'offline',
                group_name TEXT,
                tags TEXT DEFAULT '[]',
                is_favorite INTEGER DEFAULT 0,
                cpu_cores INTEGER,
                ram_total INTEGER,
                os TEXT,
                arch TEXT,
                agent_version TEXT,
                last_heartbeat DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this._offlineDetectionLoop();
        console.log('[NodeRegistry] Initialized cluster_nodes table and offline detection loop.');
    }

    /**
     * Retrieves or generates the cluster JWT secret.
     * Priority: env CLUSTER_SECRET > settings table > auto-generate and persist.
     * @returns {string} The cluster JWT signing secret.
     */
    static _getClusterSecret() {
        if (process.env.CLUSTER_SECRET) {
            return process.env.CLUSTER_SECRET;
        }

        try {
            const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('cluster_secret');
            if (row) {
                return row.value;
            }
        } catch (err) {
            // Settings table may not exist yet in edge cases
            console.error('[NodeRegistry] Could not read settings table:', err.message);
        }

        // Generate a new secret and persist it
        const secret = crypto.randomBytes(64).toString('hex');
        try {
            db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run('cluster_secret', secret);
            console.log('[NodeRegistry] Auto-generated and stored cluster secret.');
        } catch (err) {
            console.error('[NodeRegistry] Failed to persist cluster secret:', err.message);
        }
        return secret;
    }

    /**
     * Registers a new agent node in the cluster.
     * @param {string} name - Human-readable node name.
     * @param {string} host - Node hostname or IP address.
     * @param {number} port - Agent port on the node.
     * @returns {{ nodeId: string, token: string }} Registration result with JWT token.
     */
    static registerNode(name, host, port) {
        try {
            const nodeId = crypto.randomUUID();
            const secret = this._getClusterSecret();
            const token = jwt.sign({ nodeId, name }, secret);

            db.prepare(`
                INSERT INTO cluster_nodes (id, name, host, port, token)
                VALUES (?, ?, ?, ?, ?)
            `).run(nodeId, name, host, port, token);

            EventBus.publish('cluster.node.registered', { nodeId, name, host, port });
            console.log(`[NodeRegistry] Registered node "${name}" (${nodeId}) at ${host}:${port}`);

            return { nodeId, token };
        } catch (err) {
            console.error('[NodeRegistry] Failed to register node:', err.message);
            throw err;
        }
    }

    /**
     * Removes a node from the cluster registry.
     * @param {string} nodeId - The node's unique identifier.
     */
    static removeNode(nodeId) {
        try {
            const node = this.getNode(nodeId);
            if (!node) {
                throw new Error(`Node ${nodeId} not found.`);
            }

            db.prepare(`DELETE FROM cluster_nodes WHERE id = ?`).run(nodeId);
            this.metricsCache.delete(nodeId);

            EventBus.publish('cluster.node.removed', { nodeId, name: node.name });
            console.log(`[NodeRegistry] Removed node "${node.name}" (${nodeId})`);
        } catch (err) {
            console.error('[NodeRegistry] Failed to remove node:', err.message);
            throw err;
        }
    }

    /**
     * Updates allowed fields on a node record.
     * @param {string} nodeId - The node's unique identifier.
     * @param {Object} updates - Key-value pairs of columns to update.
     */
    static updateNode(nodeId, updates) {
        const ALLOWED_COLUMNS = [
            'name', 'host', 'port', 'group_name', 'tags', 'is_favorite',
            'cpu_cores', 'ram_total', 'os', 'arch', 'agent_version'
        ];

        try {
            const entries = Object.entries(updates).filter(([key]) => ALLOWED_COLUMNS.includes(key));
            if (entries.length === 0) {
                throw new Error('No valid columns provided for update.');
            }

            const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
            const values = entries.map(([, value]) => typeof value === 'object' ? JSON.stringify(value) : value);

            db.prepare(`UPDATE cluster_nodes SET ${setClauses} WHERE id = ?`).run(...values, nodeId);

            EventBus.publish('cluster.node.updated', { nodeId, updates: Object.fromEntries(entries) });
            console.log(`[NodeRegistry] Updated node ${nodeId}: ${entries.map(([k]) => k).join(', ')}`);
        } catch (err) {
            console.error('[NodeRegistry] Failed to update node:', err.message);
            throw err;
        }
    }

    /**
     * Retrieves a single node by its ID.
     * @param {string} nodeId - The node's unique identifier.
     * @returns {Object|undefined} The node record or undefined.
     */
    static getNode(nodeId) {
        try {
            return db.prepare(`SELECT * FROM cluster_nodes WHERE id = ?`).get(nodeId);
        } catch (err) {
            console.error('[NodeRegistry] Failed to get node:', err.message);
            throw err;
        }
    }

    /**
     * Retrieves all registered cluster nodes.
     * @returns {Object[]} Array of all node records.
     */
    static getAllNodes() {
        try {
            return db.prepare(`SELECT * FROM cluster_nodes ORDER BY created_at DESC`).all();
        } catch (err) {
            console.error('[NodeRegistry] Failed to get all nodes:', err.message);
            throw err;
        }
    }

    /**
     * Retrieves nodes belonging to a specific group.
     * @param {string} group - The group name to filter by.
     * @returns {Object[]} Array of matching node records.
     */
    static getNodesByGroup(group) {
        try {
            return db.prepare(`SELECT * FROM cluster_nodes WHERE group_name = ?`).all(group);
        } catch (err) {
            console.error('[NodeRegistry] Failed to get nodes by group:', err.message);
            throw err;
        }
    }

    /**
     * Retrieves all nodes currently marked as online.
     * @returns {Object[]} Array of online node records.
     */
    static getOnlineNodes() {
        try {
            return db.prepare(`SELECT * FROM cluster_nodes WHERE status = 'online'`).all();
        } catch (err) {
            console.error('[NodeRegistry] Failed to get online nodes:', err.message);
            throw err;
        }
    }

    /**
     * Processes a heartbeat from a node agent - marks online, updates timestamp,
     * and caches the reported metrics.
     * @param {string} nodeId - The node's unique identifier.
     * @param {Object} metrics - System metrics reported by the agent (cpu, ram, disk, etc.).
     */
    static updateHeartbeat(nodeId, metrics = {}) {
        try {
            const now = new Date().toISOString();
            db.prepare(`
                UPDATE cluster_nodes SET status = 'online', last_heartbeat = ? WHERE id = ?
            `).run(now, nodeId);

            this.metricsCache.set(nodeId, { ...metrics, timestamp: now });

            EventBus.publish('cluster.node.heartbeat', { nodeId, metrics, timestamp: now });
        } catch (err) {
            console.error('[NodeRegistry] Failed to update heartbeat:', err.message);
            throw err;
        }
    }

    /**
     * Sets the status of a specific node.
     * @param {string} nodeId - The node's unique identifier.
     * @param {string} status - The new status ('online', 'offline', 'maintenance', etc.).
     */
    static setStatus(nodeId, status) {
        try {
            db.prepare(`UPDATE cluster_nodes SET status = ? WHERE id = ?`).run(status, nodeId);
            console.log(`[NodeRegistry] Node ${nodeId} status set to "${status}"`);
        } catch (err) {
            console.error('[NodeRegistry] Failed to set status:', err.message);
            throw err;
        }
    }

    /**
     * Returns the most recently cached metrics for a node.
     * @param {string} nodeId - The node's unique identifier.
     * @returns {Object|null} Latest metrics object or null if not available.
     */
    static getLatestMetrics(nodeId) {
        return this.metricsCache.get(nodeId) || null;
    }

    /**
     * Starts the offline detection loop that marks stale nodes as offline.
     * Runs every 15 seconds, checking for nodes whose heartbeat is older than 30 seconds.
     * @private
     */
    static _offlineDetectionLoop() {
        if (this._offlineTimer) {
            clearInterval(this._offlineTimer);
        }

        this._offlineTimer = setInterval(() => {
            try {
                const staleNodes = db.prepare(`
                    SELECT id, name FROM cluster_nodes
                    WHERE status = 'online'
                      AND last_heartbeat IS NOT NULL
                      AND last_heartbeat < datetime('now', '-30 seconds')
                `).all();

                for (const node of staleNodes) {
                    db.prepare(`UPDATE cluster_nodes SET status = 'offline' WHERE id = ?`).run(node.id);
                    this.metricsCache.delete(node.id);

                    EventBus.publish('cluster.node.offline', { nodeId: node.id, name: node.name });
                    console.log(`[NodeRegistry] Node "${node.name}" (${node.id}) detected as offline (heartbeat timeout).`);
                }
            } catch (err) {
                console.error('[NodeRegistry] Offline detection loop error:', err.message);
            }
        }, 15_000);
    }
}
