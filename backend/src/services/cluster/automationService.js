import EventBus from '../eventBus.js';
import { ServiceDiscoveryService } from './serviceDiscoveryService.js';
import { NodeRegistryService } from './nodeRegistryService.js';
import { AgentGatewayService } from './agentGatewayService.js';

export class AutomationService {
    static init() {
        console.log('[Automation] Initializing cluster automation loops...');
        
        // 1. Service Health Checks
        setInterval(() => {
            ServiceDiscoveryService.healthCheck().catch(err => 
                console.error('[Automation] Health check failed:', err)
            );
        }, 60000); // Every 60s

        // 2. Listen for Node Offline Events
        EventBus.on('cluster.node.offline', async (data) => {
            const { nodeId } = data;
            console.log(`[Automation] Node ${nodeId} went offline. Triggering auto-recovery evaluation...`);
            
            // In a full implementation, this would look up apps assigned to this node,
            // find a healthy node, and trigger a redeployment.
            // this.recoverNodeWorkload(nodeId);
        });

        // 3. Listen for Deployment Failures
        EventBus.on('cluster.deployment.failed', async (data) => {
            const { deploymentId, appId, nodeId, error } = data;
            console.log(`[Automation] Deployment ${deploymentId} failed on node ${nodeId}.`);
            // Trigger retry logic here (with backoff/max retries state in memory/db)
        });

        // 4. Auto-restart Loop (Ping agents for crashed PM2 processes)
        setInterval(async () => {
            try {
                const nodes = NodeRegistryService.getOnlineNodes();
                for (const node of nodes) {
                    try {
                        const processes = await AgentGatewayService.sendCommand(node.id, 'pm2:list', {});
                        if (processes && processes.length > 0) {
                            for (const proc of processes) {
                                if (proc.status === 'errored' || proc.status === 'stopped') {
                                    console.log(`[Automation] Process ${proc.name} crashed on node ${node.id}. Auto-restarting...`);
                                    await AgentGatewayService.sendCommand(node.id, 'pm2:restart', { name: proc.name });
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore agent timeouts in loop
                    }
                }
            } catch (err) {
                console.error('[Automation] PM2 Auto-restart loop error:', err);
            }
        }, 120000); // Every 2 minutes
    }
}
