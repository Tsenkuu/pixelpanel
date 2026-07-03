import express from 'express';
import { WebhookController } from '../controllers/webhookController.js';

const router = express.Router();

// Public routes for GitHub/Gitlab payloads and badges
router.post('/:appId/push', WebhookController.handleGitPush);
router.get('/:appId/badge', WebhookController.getStatusBadge);

export default router;
