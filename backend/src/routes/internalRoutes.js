import express from 'express';
import { InternalController } from '../controllers/internalController.js';

const router = express.Router();

// Public internal endpoint that Nginx hits when a scaled-to-zero app receives traffic
router.all('/wakeup/:appName', InternalController.wakeupApp);

export default router;
