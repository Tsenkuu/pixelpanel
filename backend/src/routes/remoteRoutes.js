import express from 'express';
import { RemoteController } from '../controllers/remoteController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All remote routes require authentication
router.use(authMiddleware);

// Remote PM2 Management
router.get('/:nodeId/pm2/list', RemoteController.pm2List);
router.post('/:nodeId/pm2/start', RemoteController.pm2Start);
router.post('/:nodeId/pm2/stop', RemoteController.pm2Stop);
router.post('/:nodeId/pm2/restart', RemoteController.pm2Restart);
router.post('/:nodeId/pm2/reload', RemoteController.pm2Reload);
router.get('/:nodeId/pm2/:appName/logs', RemoteController.pm2Logs);
router.get('/:nodeId/pm2/:appName/metrics', RemoteController.pm2Metrics);

// Remote File Management
router.get('/:nodeId/files', RemoteController.filesList);
router.get('/:nodeId/files/read', RemoteController.filesRead);
router.post('/:nodeId/files/write', RemoteController.filesWrite);
router.post('/:nodeId/files/delete', RemoteController.filesDelete);
router.post('/:nodeId/files/rename', RemoteController.filesRename);
router.post('/:nodeId/files/zip', RemoteController.filesZip);
router.post('/:nodeId/files/extract', RemoteController.filesExtract);
router.post('/:nodeId/files/permissions', RemoteController.filesPermissions);
router.post('/:nodeId/files/upload', RemoteController.filesUpload);
router.get('/:nodeId/files/download', RemoteController.filesDownload);

// Remote Terminal
router.post('/:nodeId/terminal/spawn', RemoteController.terminalSpawn);

export default router;
