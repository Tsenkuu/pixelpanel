import express from 'express';
import { ClusterController } from '../controllers/clusterController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All cluster routes require authentication
router.use(authMiddleware);

// Node Management
router.get('/nodes', ClusterController.listNodes);
router.post('/nodes', ClusterController.registerNode);
router.get('/nodes/:id', ClusterController.getNode);
router.put('/nodes/:id', ClusterController.updateNode);
router.delete('/nodes/:id', ClusterController.removeNode);

// Node Actions
router.post('/nodes/:id/reboot', ClusterController.rebootNode);
router.post('/nodes/:id/shutdown', ClusterController.shutdownNode);
router.post('/nodes/:id/drain', ClusterController.drainNode);
router.post('/nodes/:id/activate', ClusterController.activateNode);

// Node Metrics
router.get('/nodes/:id/metrics', ClusterController.getNodeMetrics);

// Cluster Health
router.get('/health', ClusterController.getClusterHealth);

// Cluster Deployments
router.post('/deploy', ClusterController.deployToCluster);
router.get('/deployments', ClusterController.getDeploymentHistory);

// Service Discovery
router.get('/services', ClusterController.getServices);

// Load Balancer
router.get('/lb/config', ClusterController.getLbConfig);

// Cluster Backup
router.post('/backup', ClusterController.triggerBackup);

// Agent Installation Script
router.get('/install-script', ClusterController.getInstallScript);

export default router;
