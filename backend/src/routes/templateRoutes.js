import express from 'express';
import { TemplateController } from '../controllers/templateController.js';
import { authMiddleware } from '../controllers/authController.js';

const router = express.Router();

router.get('/', authMiddleware, TemplateController.getTemplates);
router.post('/deploy', authMiddleware, TemplateController.deployTemplate);

export default router;
