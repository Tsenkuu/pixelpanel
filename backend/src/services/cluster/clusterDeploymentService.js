import { AgentGatewayService } from './agentGatewayService.js';
import { NodeRegistryService } from './nodeRegistryService.js';
import db from '../../repositories/db.js';
import EventBus from '../eventBus.js';

export class ClusterDeploymentService {
    /**
     * Deploys an app to a single node.
     * @param {number} appId
     * @param {string} nodeId
     * @param {Object} config
     * @returns {Promise<Object>}
     */
    static async deployToNode(appId, nodeId, config) {
        return new Promise(async (resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO cluster_deployments (app_id, node_id, strategy, status)
                VALUES (?, ?, ?, 'pending')
            `);
            const info = stmt.run(appId, nodeId, 'single');
            const deploymentId = info.lastInsertRowid;

            try {
                // Check if node is online
                const node = NodeRegistryService.getNode(nodeId);
                if (!node || node.status !== 'online') {
                    throw new Error(`Node ${nodeId} is not online or does not exist.`);
                }

                // Update status to deploying
                db.prepare(`UPDATE cluster_deployments SET status = 'deploying' WHERE id = ?`).run(deploymentId);
                EventBus.emit('cluster.deployment.started', { deploymentId, appId, nodeId });

                // Send deployment command to agent
                const result = await AgentGatewayService.sendCommand(nodeId, 'deploy:execute', config);

                if (result.success) {
                    db.prepare(`
                        UPDATE cluster_deployments 
                        SET status = 'success', logs = ?, completed_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    `).run(result.logs || 'Deployment successful.', deploymentId);
                    
                    EventBus.emit('cluster.deployment.success', { deploymentId, appId, nodeId });
                    resolve({ success: true, deploymentId, logs: result.logs });
                } else {
                    throw new Error(result.error || 'Deployment failed on agent.');
                }
            } catch (error) {
                db.prepare(`
                    UPDATE cluster_deployments 
                    SET status = 'failed', logs = ?, completed_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(error.message, deploymentId);
                
                EventBus.emit('cluster.deployment.failed', { deploymentId, appId, nodeId, error: error.message });
                reject(error);
            }
        });
    }

    /**
     * Deploys an app to multiple nodes using a specific strategy.
     * @param {number} appId
     * @param {string[]} nodeIds
     * @param {Object} config
     * @param {string} strategy 'rolling', 'parallel', or 'canary'
     */
    static async deployToNodes(appId, nodeIds, config, strategy = 'rolling') {
        const results = [];
        
        if (strategy === 'parallel') {
            const promises = nodeIds.map(nodeId => 
                this.deployToNode(appId, nodeId, config).catch(err => ({ success: false, error: err.message, nodeId }))
            );
            return await Promise.all(promises);
        }
        
        if (strategy === 'rolling') {
            for (const nodeId of nodeIds) {
                try {
                    const res = await this.deployToNode(appId, nodeId, config);
                    results.push({ nodeId, success: true, data: res });
                } catch (error) {
                    results.push({ nodeId, success: false, error: error.message });
                    // In a true rolling deploy, if one fails, we stop the rollout
                    break;
                }
            }
            return results;
        }

        if (strategy === 'canary') {
            if (nodeIds.length === 0) return [];
            
            // Deploy to first node (canary)
            const canaryNode = nodeIds[0];
            try {
                const res = await this.deployToNode(appId, canaryNode, config);
                results.push({ nodeId: canaryNode, success: true, data: res, isCanary: true });
                
                // Wait 60s (simulated here with 5s for brevity in this MVP)
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Deploy to the rest parallel
                const restNodes = nodeIds.slice(1);
                if (restNodes.length > 0) {
                   const promises = restNodes.map(nodeId => 
                       this.deployToNode(appId, nodeId, config).catch(err => ({ success: false, error: err.message, nodeId }))
                   );
                   const restResults = await Promise.all(promises);
                   results.push(...restResults);
                }
            } catch (error) {
                 results.push({ nodeId: canaryNode, success: false, error: error.message, isCanary: true });
            }
            return results;
        }
        
        throw new Error(`Unknown deployment strategy: ${strategy}`);
    }

    /**
     * Deploys an app to all online nodes in the cluster.
     */
    static async deployToCluster(appId, config) {
        const onlineNodes = NodeRegistryService.getOnlineNodes();
        if (onlineNodes.length === 0) {
            throw new Error('No online nodes available in the cluster.');
        }
        const nodeIds = onlineNodes.map(n => n.id);
        return this.deployToNodes(appId, nodeIds, config, 'rolling');
    }

    /**
     * Rollback a deployment on a specific node.
     */
    static async rollback(appId, nodeId) {
        try {
            const result = await AgentGatewayService.sendCommand(nodeId, 'deploy:rollback', { appName: `app_${appId}` });
            if (!result.success) throw new Error(result.error || 'Rollback failed.');
            return result;
        } catch (error) {
            throw new Error(`Rollback failed on node ${nodeId}: ${error.message}`);
        }
    }

    /**
     * Get deployment history.
     */
    static getHistory(appId = null) {
        if (appId) {
            return db.prepare(`SELECT * FROM cluster_deployments WHERE app_id = ? ORDER BY started_at DESC LIMIT 50`).all(appId);
        }
        return db.prepare(`SELECT * FROM cluster_deployments ORDER BY started_at DESC LIMIT 100`).all();
    }
}
