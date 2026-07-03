import express from 'express';
import { MetricsController } from '../controllers/metricsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all metrics routes
router.use(authMiddleware);

router.get('/history', MetricsController.getHistory);
router.get('/export', MetricsController.exportData);

export default router;
