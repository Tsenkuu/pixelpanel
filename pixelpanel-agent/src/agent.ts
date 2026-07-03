/**
 * @module agent
 * @description PixelPanel Agent — main entry point.
 *
 * Connects to the PixelPanel master server via WebSocket, authenticates,
 * sends periodic heartbeat metrics, and dispatches incoming commands to
 * the appropriate service handlers.
 *
 * Environment variables:
 * - MASTER_URL: Master server hostname:port (required)
 * - NODE_TOKEN: Authentication token for this node (required)
 * - NODE_ID: Unique identifier for this node (required)
 *
 * Command namespaces: pm2:*, fs:*, terminal:*, deploy:*, system:*
 */

import WebSocket from 'ws';
import os from 'node:os';
import { MetricsService } from './services/metricsService.js';
import { PM2Service } from './services/pm2Service.js';
import { FileService } from './services/fileService.js';
import { TerminalService } from './services/terminalService.js';
import { DeploymentService } from './services/deploymentService.js';
import type { AgentMessage } from './types.js';

// ─── Configuration ───────────────────────────────────────────────────

const MASTER_URL = process.env.MASTER_URL;
const NODE_TOKEN = process.env.NODE_TOKEN;
const NODE_ID = process.env.NODE_ID;

/** Heartbeat interval in milliseconds */
const HEARTBEAT_INTERVAL_MS = 10_000;

/** Reconnect backoff parameters */
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

// ─── Logger ──────────────────────────────────────────────────────────

/**
 * Logs a message with [Agent] prefix and ISO timestamp.
 *
 * @param level - Log level (info, warn, error)
 * @param message - Log message
 * @param data - Optional additional data to log
 */
function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[Agent] [${timestamp}] [${level.toUpperCase()}]`;

  if (data !== undefined) {
    console[level](`${prefix} ${message}`, data);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

// ─── Validate Configuration ──────────────────────────────────────────

if (!MASTER_URL) {
  log('error', 'MASTER_URL environment variable is required');
  process.exit(1);
}

if (!NODE_TOKEN) {
  log('error', 'NODE_TOKEN environment variable is required');
  process.exit(1);
}

if (!NODE_ID) {
  log('error', 'NODE_ID environment variable is required');
  process.exit(1);
}

// ─── Service Initialization ──────────────────────────────────────────

const metricsService = new MetricsService();
const pm2Service = new PM2Service();
const fileService = new FileService();
const terminalService = new TerminalService();
const deploymentService = new DeploymentService(pm2Service);

// ─── WebSocket Agent ─────────────────────────────────────────────────

/** Current reconnect attempt count for exponential backoff */
let reconnectAttempts = 0;

/** Reference to the active WebSocket connection */
let ws: WebSocket | null = null;

/** Reference to the heartbeat interval timer */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/** Flag to prevent reconnection during shutdown */
let isShuttingDown = false;

/**
 * Sends a JSON message over the WebSocket connection.
 *
 * @param message - AgentMessage to send
 */
function send(message: AgentMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Sends a response message correlating to a request ID.
 *
 * @param id - Request message ID to respond to
 * @param type - Response type
 * @param payload - Response payload
 */
function sendResponse(id: string | undefined, type: string, payload: unknown): void {
  send({ type, id, payload });
}

/**
 * Sends an error response for a failed command.
 *
 * @param id - Request message ID
 * @param type - Original command type
 * @param error - Error that occurred
 */
function sendError(id: string | undefined, type: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  send({
    type: `${type}:error`,
    id,
    payload: { error: message },
  });
}

// ─── Command Handlers ────────────────────────────────────────────────

/**
 * Handles PM2 process management commands.
 *
 * @param action - PM2 action (list, start, stop, restart, reload, delete, logs, metrics)
 * @param id - Message correlation ID
 * @param payload - Command parameters
 */
async function handlePM2Command(action: string, id: string | undefined, payload: any): Promise<void> {
  switch (action) {
    case 'list': {
      const processes = await pm2Service.list();
      sendResponse(id, 'pm2:list', { processes });
      break;
    }
    case 'start': {
      const result = await pm2Service.start(
        payload.name,
        payload.script,
        payload.cwd,
        payload.env
      );
      sendResponse(id, 'pm2:start', { process: result });
      break;
    }
    case 'stop': {
      const result = await pm2Service.stop(payload.name);
      sendResponse(id, 'pm2:stop', { process: result });
      break;
    }
    case 'restart': {
      const result = await pm2Service.restart(payload.name);
      sendResponse(id, 'pm2:restart', { process: result });
      break;
    }
    case 'reload': {
      const result = await pm2Service.reload(payload.name);
      sendResponse(id, 'pm2:reload', { process: result });
      break;
    }
    case 'delete': {
      const result = await pm2Service.deletePm2(payload.name);
      sendResponse(id, 'pm2:delete', { process: result });
      break;
    }
    case 'logs': {
      const output = await pm2Service.logs(payload.name, payload.lines);
      sendResponse(id, 'pm2:logs', { output });
      break;
    }
    case 'metrics': {
      const result = await pm2Service.metrics(payload.name);
      sendResponse(id, 'pm2:metrics', { process: result });
      break;
    }
    default:
      sendError(id, 'pm2', new Error(`Unknown PM2 action: ${action}`));
  }
}

/**
 * Handles file system commands.
 *
 * @param action - FS action (list, read, write, remove, rename, zip, extract, chmod, stat)
 * @param id - Message correlation ID
 * @param payload - Command parameters
 */
async function handleFSCommand(action: string, id: string | undefined, payload: any): Promise<void> {
  switch (action) {
    case 'list': {
      const entries = await fileService.list(payload.path);
      sendResponse(id, 'fs:list', { entries });
      break;
    }
    case 'read': {
      const content = await fileService.read(payload.path);
      sendResponse(id, 'fs:read', { content });
      break;
    }
    case 'write': {
      await fileService.write(payload.path, payload.content);
      sendResponse(id, 'fs:write', { success: true });
      break;
    }
    case 'remove': {
      await fileService.remove(payload.path);
      sendResponse(id, 'fs:remove', { success: true });
      break;
    }
    case 'rename': {
      await fileService.rename(payload.oldPath, payload.newPath);
      sendResponse(id, 'fs:rename', { success: true });
      break;
    }
    case 'zip': {
      const size = await fileService.zip(payload.source, payload.output);
      sendResponse(id, 'fs:zip', { size });
      break;
    }
    case 'extract': {
      await fileService.extract(payload.archive, payload.target);
      sendResponse(id, 'fs:extract', { success: true });
      break;
    }
    case 'chmod': {
      await fileService.chmod(payload.path, payload.mode);
      sendResponse(id, 'fs:chmod', { success: true });
      break;
    }
    case 'stat': {
      const stats = await fileService.stat(payload.path);
      sendResponse(id, 'fs:stat', stats);
      break;
    }
    default:
      sendError(id, 'fs', new Error(`Unknown FS action: ${action}`));
  }
}

/**
 * Handles terminal PTY session commands.
 *
 * @param action - Terminal action (spawn, input, resize, close)
 * @param id - Message correlation ID
 * @param payload - Command parameters
 */
async function handleTerminalCommand(action: string, id: string | undefined, payload: any): Promise<void> {
  switch (action) {
    case 'spawn': {
      const sessionId: string = payload.sessionId;
      const callbacks = terminalService.spawn(
        sessionId,
        payload.shell,
        payload.cols,
        payload.rows
      );

      // Stream PTY output back to master
      callbacks.onData((data: string) => {
        send({
          type: 'terminal:output',
          payload: { sessionId, data },
        });
      });

      // Notify master when session exits
      callbacks.onExit((exitCode: number) => {
        send({
          type: 'terminal:exit',
          payload: { sessionId, exitCode },
        });
      });

      sendResponse(id, 'terminal:spawn', { sessionId, success: true });
      break;
    }
    case 'input': {
      terminalService.input(payload.sessionId, payload.data);
      // No response needed for stdin input — it's fire-and-forget
      break;
    }
    case 'resize': {
      terminalService.resize(payload.sessionId, payload.cols, payload.rows);
      sendResponse(id, 'terminal:resize', { success: true });
      break;
    }
    case 'close': {
      terminalService.close(payload.sessionId);
      sendResponse(id, 'terminal:close', { sessionId: payload.sessionId, success: true });
      break;
    }
    default:
      sendError(id, 'terminal', new Error(`Unknown terminal action: ${action}`));
  }
}

/**
 * Handles deployment commands.
 *
 * @param action - Deploy action (execute, rollback)
 * @param id - Message correlation ID
 * @param payload - Command parameters
 */
async function handleDeployCommand(action: string, id: string | undefined, payload: any): Promise<void> {
  switch (action) {
    case 'execute': {
      const output = await deploymentService.execute(payload.config);
      sendResponse(id, 'deploy:execute', { output });
      break;
    }
    case 'rollback': {
      const output = await deploymentService.rollback(payload.appName);
      sendResponse(id, 'deploy:rollback', { output });
      break;
    }
    default:
      sendError(id, 'deploy', new Error(`Unknown deploy action: ${action}`));
  }
}

/**
 * Handles system-level commands.
 *
 * @param action - System action (metrics, info, ping)
 * @param id - Message correlation ID
 * @param payload - Command parameters
 */
async function handleSystemCommand(action: string, id: string | undefined, payload: any): Promise<void> {
  switch (action) {
    case 'metrics': {
      const metrics = await metricsService.collectMetrics();
      sendResponse(id, 'system:metrics', metrics);
      break;
    }
    case 'info': {
      sendResponse(id, 'system:info', {
        nodeId: NODE_ID,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        totalMemory: os.totalmem(),
        cpus: os.cpus().length,
        nodeVersion: process.version,
        agentVersion: '1.0.0',
      });
      break;
    }
    case 'ping': {
      sendResponse(id, 'system:pong', { timestamp: Date.now() });
      break;
    }
    default:
      sendError(id, 'system', new Error(`Unknown system action: ${action}`));
  }
}

// ─── Message Dispatcher ──────────────────────────────────────────────

/**
 * Dispatches incoming WebSocket messages to the appropriate command handler.
 * Parses the message type as 'namespace:action' and routes accordingly.
 *
 * @param message - Parsed AgentMessage from the master server
 */
async function dispatchMessage(message: AgentMessage): Promise<void> {
  const { type, id, payload } = message;
  const [namespace, action] = type.split(':');

  if (!namespace || !action) {
    log('warn', `Invalid message type format: '${type}' (expected 'namespace:action')`);
    sendError(id, type, new Error(`Invalid message type: ${type}`));
    return;
  }

  log('info', `Handling command: ${type}`, id ? { id } : undefined);

  try {
    switch (namespace) {
      case 'pm2':
        await handlePM2Command(action, id, payload);
        break;
      case 'fs':
        await handleFSCommand(action, id, payload);
        break;
      case 'terminal':
        await handleTerminalCommand(action, id, payload);
        break;
      case 'deploy':
        await handleDeployCommand(action, id, payload);
        break;
      case 'system':
        await handleSystemCommand(action, id, payload);
        break;
      default:
        log('warn', `Unknown command namespace: '${namespace}'`);
        sendError(id, type, new Error(`Unknown command namespace: ${namespace}`));
    }
  } catch (error) {
    log('error', `Command '${type}' failed`, error);
    sendError(id, type, error);
  }
}

// ─── Heartbeat ───────────────────────────────────────────────────────

/**
 * Starts the periodic heartbeat that sends system metrics to the master.
 * Runs every HEARTBEAT_INTERVAL_MS (10 seconds).
 */
function startHeartbeat(): void {
  stopHeartbeat();

  heartbeatTimer = setInterval(async () => {
    try {
      const metrics = await metricsService.collectMetrics();
      send({
        type: 'heartbeat',
        payload: {
          nodeId: NODE_ID,
          timestamp: Date.now(),
          metrics,
        },
      });
    } catch (error) {
      log('error', 'Heartbeat metrics collection failed', error);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Prevent the timer from keeping the process alive during shutdown
  heartbeatTimer.unref();
}

/**
 * Stops the periodic heartbeat.
 */
function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ─── WebSocket Connection ────────────────────────────────────────────

/**
 * Establishes a WebSocket connection to the master server.
 * Handles authentication, message dispatching, and reconnection logic.
 */
function connect(): void {
  if (isShuttingDown) return;

  const wsUrl = `wss://${MASTER_URL}/agent`;
  log('info', `Connecting to master at ${wsUrl}...`);

  ws = new WebSocket(wsUrl, {
    headers: {
      'X-Node-ID': NODE_ID!,
    },
    handshakeTimeout: 10_000,
  });

  ws.on('open', () => {
    log('info', 'WebSocket connection established');
    reconnectAttempts = 0;

    // Send authentication message
    send({
      type: 'auth',
      payload: {
        token: NODE_TOKEN,
        nodeId: NODE_ID,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        agentVersion: '1.0.0',
      },
    });

    log('info', 'Authentication message sent');

    // Start heartbeat after authentication
    startHeartbeat();
  });

  ws.on('message', (data: WebSocket.RawData) => {
    try {
      const message: AgentMessage = JSON.parse(data.toString());
      dispatchMessage(message).catch((error) => {
        log('error', 'Unhandled dispatch error', error);
      });
    } catch (error) {
      log('error', 'Failed to parse incoming message', error);
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    log('warn', `WebSocket closed: code=${code}, reason=${reason.toString()}`);
    stopHeartbeat();
    scheduleReconnect();
  });

  ws.on('error', (error: Error) => {
    log('error', `WebSocket error: ${error.message}`);
    // The 'close' event will fire after this, triggering reconnection
  });

  ws.on('ping', () => {
    ws?.pong();
  });
}

/**
 * Schedules a reconnection attempt with exponential backoff.
 * Delay doubles on each attempt from RECONNECT_BASE_MS up to RECONNECT_MAX_MS.
 */
function scheduleReconnect(): void {
  if (isShuttingDown) return;

  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts),
    RECONNECT_MAX_MS
  );

  reconnectAttempts++;
  log('info', `Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);

  setTimeout(() => {
    connect();
  }, delay);
}

// ─── Graceful Shutdown ───────────────────────────────────────────────

/**
 * Performs graceful shutdown of the agent.
 * Closes WebSocket connection, stops heartbeat, and cleans up terminal sessions.
 *
 * @param signal - The OS signal that triggered shutdown
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log('info', `Received ${signal}, starting graceful shutdown...`);

  // Stop heartbeat
  stopHeartbeat();

  // Close all terminal sessions
  log('info', 'Closing terminal sessions...');
  terminalService.closeAll();

  // Close WebSocket connection
  if (ws) {
    try {
      // Send disconnect notification to master
      send({
        type: 'disconnect',
        payload: {
          nodeId: NODE_ID,
          reason: signal,
        },
      });

      ws.close(1000, 'Agent shutting down');
    } catch {
      // Best-effort close
    }
    ws = null;
  }

  log('info', 'Graceful shutdown completed');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors gracefully
process.on('uncaughtException', (error: Error) => {
  log('error', `Uncaught exception: ${error.message}`, error.stack);
  // Don't exit — try to keep the agent running
});

process.on('unhandledRejection', (reason: unknown) => {
  log('error', 'Unhandled promise rejection', reason);
  // Don't exit — try to keep the agent running
});

// ─── Start Agent ─────────────────────────────────────────────────────

log('info', `PixelPanel Agent v1.0.0 starting`);
log('info', `Node ID: ${NODE_ID}`);
log('info', `Hostname: ${os.hostname()}`);
log('info', `Platform: ${os.platform()} ${os.arch()}`);
log('info', `Node.js: ${process.version}`);
log('info', `Master URL: ${MASTER_URL}`);

connect();
