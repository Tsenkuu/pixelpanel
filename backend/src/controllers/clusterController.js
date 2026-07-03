import { NodeRegistryService } from '../services/cluster/nodeRegistryService.js';
import { AgentGatewayService } from '../services/cluster/agentGatewayService.js';
import { ClusterDeploymentService } from '../services/cluster/clusterDeploymentService.js';
import { LoadBalancerService } from '../services/cluster/loadBalancerService.js';
import { ServiceDiscoveryService } from '../services/cluster/serviceDiscoveryService.js';
import { ClusterBackupService } from '../services/cluster/clusterBackupService.js';

export class ClusterController {
    /**
     * GET /api/cluster/nodes — List all registered nodes
     */
    static async listNodes(req, res) {
        try {
            const nodes = NodeRegistryService.getAllNodes();
            // Enrich with live connection status and latest metrics
            const enriched = nodes.map(node => ({
                ...node,
                isConnected: AgentGatewayService.isNodeConnected(node.id),
                metrics: NodeRegistryService.getLatestMetrics(node.id) || null
            }));
            res.json(enriched);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/nodes — Register a new agent node
     */
    static async registerNode(req, res) {
        try {
            const { name, host, port } = req.body;
            if (!name || !host) {
                return res.status(400).json({ error: 'Name and host are required.' });
            }
            const result = NodeRegistryService.registerNode(name, host, port || 3001);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/nodes/:id — Get a specific node
     */
    static async getNode(req, res) {
        try {
            const node = NodeRegistryService.getNode(req.params.id);
            if (!node) return res.status(404).json({ error: 'Node not found.' });
            node.isConnected = AgentGatewayService.isNodeConnected(node.id);
            node.metrics = NodeRegistryService.getLatestMetrics(node.id) || null;
            res.json(node);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/cluster/nodes/:id — Update node details
     */
    static async updateNode(req, res) {
        try {
            NodeRegistryService.updateNode(req.params.id, req.body);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/cluster/nodes/:id — Remove a node
     */
    static async removeNode(req, res) {
        try {
            NodeRegistryService.removeNode(req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/nodes/:id/reboot — Reboot a node
     */
    static async rebootNode(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.id, 'system:reboot', {});
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/nodes/:id/shutdown — Shutdown a node
     */
    static async shutdownNode(req, res) {
        try {
            const result = await AgentGatewayService.sendCommand(req.params.id, 'system:shutdown', {});
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/nodes/:id/drain — Set node to drain mode
     */
    static async drainNode(req, res) {
        try {
            NodeRegistryService.setStatus(req.params.id, 'drain');
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/nodes/:id/activate — Activate a node (remove drain/maintenance)
     */
    static async activateNode(req, res) {
        try {
            const isConnected = AgentGatewayService.isNodeConnected(req.params.id);
            NodeRegistryService.setStatus(req.params.id, isConnected ? 'online' : 'offline');
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/nodes/:id/metrics — Get latest metrics for a node
     */
    static async getNodeMetrics(req, res) {
        try {
            const metrics = NodeRegistryService.getLatestMetrics(req.params.id);
            if (!metrics) return res.status(404).json({ error: 'No metrics available for this node.' });
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/health — Cluster health summary
     */
    static async getClusterHealth(req, res) {
        try {
            const allNodes = NodeRegistryService.getAllNodes();
            const onlineNodes = allNodes.filter(n => n.status === 'online');
            const offlineNodes = allNodes.filter(n => n.status === 'offline');
            const drainNodes = allNodes.filter(n => n.status === 'drain');

            // Aggregate resources from latest metrics
            let totalCpu = 0, totalRam = 0, usedRam = 0;
            for (const node of onlineNodes) {
                const metrics = NodeRegistryService.getLatestMetrics(node.id);
                if (metrics) {
                    totalCpu += metrics.cpu?.load || 0;
                    totalRam += metrics.ram?.total || 0;
                    usedRam += metrics.ram?.used || 0;
                }
            }

            const services = ServiceDiscoveryService.getAllServices();

            res.json({
                totalNodes: allNodes.length,
                onlineCount: onlineNodes.length,
                offlineCount: offlineNodes.length,
                drainCount: drainNodes.length,
                avgCpuLoad: onlineNodes.length > 0 ? (totalCpu / onlineNodes.length).toFixed(1) : 0,
                totalRamGB: (totalRam / 1024 / 1024 / 1024).toFixed(2),
                usedRamGB: (usedRam / 1024 / 1024 / 1024).toFixed(2),
                totalServices: services.length,
                healthyServices: services.filter(s => s.health_status === 'healthy').length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/deploy — Deploy to cluster
     */
    static async deployToCluster(req, res) {
        try {
            const { appId, nodeIds, strategy, config } = req.body;
            if (!appId) return res.status(400).json({ error: 'appId is required.' });

            let result;
            if (nodeIds && nodeIds.length > 0) {
                result = await ClusterDeploymentService.deployToNodes(appId, nodeIds, config, strategy || 'rolling');
            } else {
                result = await ClusterDeploymentService.deployToCluster(appId, config);
            }
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/deployments — Deployment history
     */
    static async getDeploymentHistory(req, res) {
        try {
            const history = ClusterDeploymentService.getHistory(req.query.appId);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/services — Service discovery registry
     */
    static async getServices(req, res) {
        try {
            const services = ServiceDiscoveryService.getAllServices();
            res.json(services);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/lb/config — Generated load balancer config
     */
    static async getLbConfig(req, res) {
        try {
            const config = LoadBalancerService.generateFullConfig();
            res.type('text/plain').send(config);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/cluster/backup — Trigger cluster-wide backup
     */
    static async triggerBackup(req, res) {
        try {
            const result = await ClusterBackupService.backupCluster();
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/cluster/install-script — Returns agent install script
     */
    static async getInstallScript(req, res) {
        const masterUrl = `${req.protocol}://${req.get('host')}`;
        const script = `#!/bin/bash
set -e

echo "[PixelPanel Agent Installer]"
echo "Master: ${masterUrl}"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Create agent directory
sudo mkdir -p /opt/pixelpanel-agent
cd /opt/pixelpanel-agent

# Download agent package (would be served by master in production)
echo "Agent installed. Configure with:"
echo "  MASTER_URL=${masterUrl}"
echo "  NODE_TOKEN=<your-token-from-dashboard>"
echo "  NODE_ID=<your-node-id>"
echo ""
echo "Then start with: node dist/agent.js"
`;
        res.type('text/plain').send(script);
    }
}
