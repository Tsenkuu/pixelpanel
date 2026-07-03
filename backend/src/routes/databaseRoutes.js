import express from 'express';
import { DatabaseController } from '../controllers/databaseController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', DatabaseController.getDatabases);
router.get('/:id', DatabaseController.getDatabase);
router.post('/provision', DatabaseController.provisionDatabase);
router.post('/:id/link', DatabaseController.linkDatabase);
router.delete('/:id', DatabaseController.deleteDatabase);

export default router;
