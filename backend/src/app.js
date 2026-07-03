import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import appsRoutes from './routes/appsRoutes.js';
import internalRoutes from './routes/internalRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import filesRoutes from './routes/filesRoutes.js';
import pluginsRoutes from './routes/pluginsRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import clusterRoutes from './routes/clusterRoutes.js';
import remoteRoutes from './routes/remoteRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';
import rateLimit from 'express-rate-limit';
import { CacheService } from './services/cacheService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security and utility middlewares
// Security Middleware (Enterprise Grade)
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.xssFilter());

// Extreme Performance: Gzip Compression for all responses
app.use(compression({
    level: 6, // Balance between CPU and Size for ARM64
    threshold: 1024 // Only compress payloads > 1KB
}));

// Rate Limiting to prevent brute force on STB
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

app.use(cors());
app.use(express.json({ limit: '1mb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/plugins', pluginsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/databases', databaseRoutes);

// Heavily Cached Routes (Extreme Performance)
app.use('/api/apps', CacheService.cacheMiddleware, appsRoutes);
app.use('/api/templates', CacheService.cacheMiddleware, templateRoutes);
app.use('/api/metrics', CacheService.cacheMiddleware, metricsRoutes);

// Cluster Management Routes
app.use('/api/cluster', clusterRoutes);
app.use('/api/remote', remoteRoutes);

// Serve the install agent bash script
app.get('/install-agent.sh', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../scripts/install.sh'));
});

// Serve Static Frontend (Production MVP)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Catch-all route to serve Vue frontend for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

export default app;
