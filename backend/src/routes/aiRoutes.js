import express from 'express';
import { AiController } from '../controllers/aiController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Must be authenticated to query the AI
router.post('/chat', authMiddleware, AiController.chat);

export default router;
