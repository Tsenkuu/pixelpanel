import express from 'express';
import { FilesController } from '../controllers/filesController.js';

const router = express.Router();

// Base operations
router.get('/:appId/list', FilesController.list);
router.get('/:appId/read', FilesController.read);
router.post('/:appId/write', FilesController.write);
router.post('/:appId/delete', FilesController.delete);
router.post('/:appId/rename', FilesController.rename);

// Archives
router.post('/:appId/zip', FilesController.zip);
router.post('/:appId/extract', FilesController.extract);

// Search
router.post('/:appId/search', FilesController.search);

// Git
router.get('/:appId/git/status', FilesController.gitStatus);
router.get('/:appId/git/diff', FilesController.gitDiff);
router.get('/:appId/git/blame', FilesController.gitBlame);

export default router;
