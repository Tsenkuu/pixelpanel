import db from '../../repositories/db.js';
import EventBus from '../eventBus.js';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * WebSocket gateway server for cluster agent connections.
 * Handles authentication, bidirectional RPC with correlation-based responses,
 * and broadcast messaging to all connected agents.
 */
export class AgentGatewayService {
    /** @type {Map<string, import('ws').WebSocket>} Connected agents keyed by nodeId */
    static connections = new Map();

    /** @type {Map<string, { resolve: Function, reject: Function, timer: ReturnType<typeof setTimeout> }>} */
    static pending = new Map();

    /** @type {WebSocketServer|null} */
    static wss = null;

    /**
     * Retrieves the cluster JWT secret (mirrors NodeRegistryService logic).
     * @returns {string} The cluster JWT signing secret.
     * @private
     */
    static _getClusterSecret() {
        if (process.env.CLUSTER_SECRET) {
            return process.env.CLUSTER_SECRET;
        }
        try {
            const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('cluster_secret');
            if (row) return row.value;
        } catch (err) {
            console.error('[AgentGateway] Could not read cluster secret from settings:', err.message);
        }
        throw new Error('Cluster secret not configured. Initialize NodeRegistryService first.');
    }

    /**
     * Initializes the WebSocket server on the provided HTTP server.
     * Agents connect to the '/agent' path and must authenticate with a JWT token
     * as their first message.
     * @param {import('http').Server} httpServer - The HTTP server to attach to.
     */
    static init(httpServer) {
        this.wss = new WebSocketServer({ server: httpServer, path: '/agent' });

        this.wss.on('connection', (ws, req) => {
            const remoteAddr = req.socket.remoteAddress;
            console.log(`[AgentGateway] New connection from ${remoteAddr}, awaiting auth...`);

            let authenticated = false;

            // 10-second auth timeout
            const authTimeout = setTimeout(() => {
                if (!authenticated) {
                    console.log(`[AgentGateway] Auth timeout for connection from ${remoteAddr}`);
                    try {
                        ws.send(JSON.stringify({ type: 'auth_timeout', error: 'Authentication timed out' }));
                    } catch (_) { /* ignore send errors on closing socket */ }
                    ws.close(4001, 'Authentication timed out');
                }
            }, 10_000);

            ws.on('message', (raw) => {
                let message;
                try {
                    message = JSON.parse(raw.toString());
                } catch (err) {
                    console.error('[AgentGateway] Failed to parse message:', err.message);
                    return;
                }

                // --- Authentication handshake ---
                if (!authenticated) {
                    if (message.type !== 'auth' || !message.token) {
                        ws.send(JSON.stringify({ type: 'auth_failed', error: 'Expected auth message with token' }));
                        ws.close(4002, 'Invalid auth message');
                        clearTimeout(authTimeout);
                        return;
                    }

                    try {
                        const secret = this._getClusterSecret();
                        const decoded = jwt.verify(message.token, secret);

                        if (!decoded.nodeId) {
                            throw new Error('Token missing nodeId claim');
                        }

                        // Close any existing connection for this node
                        const existing = this.connections.get(decoded.nodeId);
                        if (existing) {
                            try { existing.close(4003, 'Replaced by new connection'); } catch (_) {}
                        }

                        authenticated = true;
                        ws.nodeId = decoded.nodeId;
                        this.connections.set(decoded.nodeId, ws);
                        clearTimeout(authTimeout);

                        ws.send(JSON.stringify({ type: 'auth_ok' }));
                        EventBus.publish('cluster.node.connected', { nodeId: decoded.nodeId });
                        console.log(`[AgentGateway] Node ${decoded.nodeId} authenticated from ${remoteAddr}`);

                    } catch (err) {
                        console.error(`[AgentGateway] Auth failed for ${remoteAddr}:`, err.message);
                        ws.send(JSON.stringify({ type: 'auth_failed', error: 'Invalid token' }));
                        ws.close(4002, 'Authentication failed');
                        clearTimeout(authTimeout);
                    }
                    return;
                }

                // --- Post-auth message handling ---
                this._handleAgentMessage(ws.nodeId, message);
            });

            ws.on('close', (code, reason) => {
                clearTimeout(authTimeout);
                if (ws.nodeId) {
                    this.connections.delete(ws.nodeId);
                    EventBus.publish('cluster.node.disconnected', { nodeId: ws.nodeId, code });
                    console.log(`[AgentGateway] Node ${ws.nodeId} disconnected (code: ${code})`);
                }
            });

            ws.on('error', (err) => {
                console.error(`[AgentGateway] WebSocket error for node ${ws.nodeId || 'unauthenticated'}:`, err.message);
            });
        });

        this.wss.on('error', (err) => {
            console.error('[AgentGateway] WebSocket server error:', err.message);
        });

        console.log('[AgentGateway] WebSocket gateway initialized on path /agent');
    }

    /**
     * Handles incoming messages from authenticated agents.
     * Resolves pending RPC promises if the message carries a correlationId.
     * @param {string} nodeId - The sending node's ID.
     * @param {Object} message - The parsed message object.
     * @private
     */
    static _handleAgentMessage(nodeId, message) {
        // Heartbeat shortcut
        if (message.type === 'heartbeat') {
            EventBus.publish('cluster.agent.heartbeat', { nodeId, metrics: message.metrics });
            return;
        }

        // RPC response correlation
        if (message.correlationId && this.pending.has(message.correlationId)) {
            const { resolve, timer } = this.pending.get(message.correlationId);
            clearTimeout(timer);
            this.pending.delete(message.correlationId);
            resolve({ success: message.success !== false, data: message.data, error: message.error });
            return;
        }

        // Generic agent events
        EventBus.publish('cluster.agent.message', { nodeId, message });
    }

    /**
     * Sends an RPC command to a specific node and waits for the response.
     * @param {string} nodeId - Target node ID.
     * @param {string} type - Command type (e.g. 'deploy', 'backup', 'health_check').
     * @param {Object} [payload={}] - Command payload.
     * @param {number} [timeoutMs=30000] - Timeout in milliseconds.
     * @returns {Promise<{ success: boolean, data?: any, error?: string }>} The agent's response.
     */
    static sendCommand(nodeId, type, payload = {}, timeoutMs = 30_000) {
        return new Promise((resolve, reject) => {
            const ws = this.connections.get(nodeId);
            if (!ws || ws.readyState !== ws.OPEN) {
                return reject(new Error(`Node ${nodeId} is not connected.`));
            }

            const correlationId = crypto.randomUUID();

            const timer = setTimeout(() => {
                this.pending.delete(correlationId);
                reject(new Error(`Command '${type}' to node ${nodeId} timed out after ${timeoutMs}ms.`));
            }, timeoutMs);

            this.pending.set(correlationId, { resolve, reject, timer });

            try {
                ws.send(JSON.stringify({ type, payload, correlationId }));
            } catch (err) {
                clearTimeout(timer);
                this.pending.delete(correlationId);
                reject(new Error(`Failed to send command to node ${nodeId}: ${err.message}`));
            }
        });
    }

    /**
     * Broadcasts a message to all connected agent nodes.
     * @param {string} type - Message type.
     * @param {Object} [payload={}] - Message payload.
     * @returns {{ sent: number, failed: number }} Broadcast result summary.
     */
    static broadcast(type, payload = {}) {
        let sent = 0;
        let failed = 0;
        const message = JSON.stringify({ type, payload });

        for (const [nodeId, ws] of this.connections) {
            try {
                if (ws.readyState === ws.OPEN) {
                    ws.send(message);
                    sent++;
                } else {
                    failed++;
                }
            } catch (err) {
                console.error(`[AgentGateway] Failed to broadcast to node ${nodeId}:`, err.message);
                failed++;
            }
        }

        return { sent, failed };
    }

    /**
     * Checks whether a specific node is currently connected.
     * @param {string} nodeId - The node ID to check.
     * @returns {boolean} True if the node has an active WebSocket connection.
     */
    static isNodeConnected(nodeId) {
        const ws = this.connections.get(nodeId);
        return !!(ws && ws.readyState === ws.OPEN);
    }

    /**
     * Returns the IDs of all currently connected agent nodes.
     * @returns {string[]} Array of connected node IDs.
     */
    static getConnectedNodeIds() {
        return Array.from(this.connections.keys()).filter(nodeId => {
            const ws = this.connections.get(nodeId);
            return ws && ws.readyState === ws.OPEN;
        });
    }
}
