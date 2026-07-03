import express from 'express';
import { AppsController } from '../controllers/appsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware); // Protect all app routes

router.get('/', AppsController.listApps);
router.post('/', AppsController.createApp);
router.delete('/:id', AppsController.deleteApp);
router.post('/:id/action/:action', AppsController.actionApp);
router.get('/:id/history', AppsController.getGitHistory);
router.get('/:id/deployments', AppsController.getDeployments);
router.post('/:id/deploy', AppsController.triggerDeployment);
router.post('/:id/deployments/:deploymentId/rollback', AppsController.rollbackDeployment);

export default router;
