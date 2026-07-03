import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { SystemService } from './services/systemService.js';
import { PM2Service } from './services/pm2Service.js';
import { NginxService } from './services/nginxService.js';
import { AiProactiveService } from './services/aiProactiveService.js';
import { JobQueueService } from './services/jobQueueService.js';
import { MetricsCollectorService } from './services/metricsCollectorService.js';
import { SecurityService } from './services/securityService.js';
import { BackupService } from './services/backupService.js';
import { FileIntegrityMonitor } from './services/fileIntegrityMonitor.js';
import { TerminalService } from './services/terminalService.js';
import { PluginManagerService } from './services/pluginManagerService.js';
import { PushNotificationService } from './services/pushNotificationService.js';
import { NodeRegistryService } from './services/cluster/nodeRegistryService.js';
import { AgentGatewayService } from './services/cluster/agentGatewayService.js';
import { AutomationService } from './services/cluster/automationService.js';
import EventBus from './services/eventBus.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', // To be restricted based on config in production
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Initialize Enterprise Security
SecurityService.init();

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    // Emit system stats every 2 seconds
    const statsInterval = setInterval(async () => {
        try {
            const stats = await SystemService.getRealtimeStats();
            socket.emit('system:stats', stats);
        } catch (error) {
            console.error('[Socket] Error sending stats:', error.message);
        }
    }, 2000);
    
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        clearInterval(statsInterval);
        TerminalService.killTerminal(socket.id);
    });

    // Web IDE Terminal Connection
    socket.on('terminal:start', (appId) => {
        TerminalService.spawnTerminal(appId, socket);
    });
});

// Forward AI RCA reports to the frontend via Socket.io
EventBus.subscribe('ai.rca.completed', (reportPayload) => {
    io.emit('notification:ai', {
        title: `AI Diagnostic: ${reportPayload.appName}`,
        message: 'A root cause analysis has been generated for a recent anomaly. Click to view.',
        report: reportPayload.report,
        type: 'warning'
    });
});

// Initialize AI Proactive Hooks
AiProactiveService.initialize();

// Start Background Queue Daemon
JobQueueService.start();

// Start Background Metrics Collector
MetricsCollectorService.start();

// Start Automated Backups
BackupService.start();

// Start File Integrity Monitor
FileIntegrityMonitor.start();

// Initialize Plugin Engine
PluginManagerService.init();

// Initialize Web Push Notifications
PushNotificationService.init();

// Initialize Node Cluster Management
NodeRegistryService.init();
AgentGatewayService.init(server);
AutomationService.init();

server.listen(PORT, () => {
    console.log(`[Server] PixelPanel backend listening on port ${PORT}`);
});
