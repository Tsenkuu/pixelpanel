/**
 * @module types
 * @description Core type definitions for the PixelPanel Agent.
 * Defines all interfaces used across the agent's services and communication layer.
 */

/**
 * Disk partition metrics for a single filesystem.
 */
export interface DiskInfo {
  /** Filesystem identifier (e.g., /dev/sda1) */
  fs: string;
  /** Mount point path */
  mount: string;
  /** Filesystem type (e.g., ext4, xfs) */
  type: string;
  /** Total disk size in bytes */
  size: number;
  /** Used disk space in bytes */
  used: number;
  /** Available disk space in bytes */
  available: number;
  /** Usage percentage (0-100) */
  use: number;
}

/**
 * Comprehensive system metrics snapshot collected from the node.
 * Designed for lightweight ARM64 devices with minimal overhead.
 */
export interface NodeMetrics {
  /** CPU metrics */
  cpu: {
    /** Current CPU load percentage (0-100) */
    load: number;
    /** Number of logical CPU cores */
    cores: number;
    /** CPU clock speed in GHz */
    speed: number;
  };
  /** RAM metrics in bytes */
  ram: {
    /** Total physical memory */
    total: number;
    /** Used memory */
    used: number;
    /** Free memory */
    free: number;
  };
  /** Disk partition metrics array */
  disk: DiskInfo[];
  /** CPU temperature in Celsius, null if unavailable */
  temperature: number | null;
  /** Swap memory metrics in bytes */
  swap: {
    /** Total swap size */
    total: number;
    /** Used swap */
    used: number;
    /** Free swap */
    free: number;
  };
  /** Network throughput in bytes per second */
  network: {
    /** Bytes received per second */
    rx: number;
    /** Bytes transmitted per second */
    tx: number;
  };
  /** System load averages: [1min, 5min, 15min] */
  loadAvg: [number, number, number];
  /** Process counts */
  processes: {
    /** Total number of processes */
    total: number;
    /** Number of running processes */
    running: number;
  };
  /** System uptime in seconds */
  uptime: number;
}

/**
 * WebSocket message envelope used for all agent-master communication.
 */
export interface AgentMessage {
  /** Message type identifier (e.g., 'auth', 'heartbeat', 'pm2:list') */
  type: string;
  /** Optional unique message ID for request-response correlation */
  id?: string;
  /** Message payload — structure depends on the message type */
  payload: any;
}

/**
 * Configuration for deploying an application to the node.
 */
export interface DeploymentConfig {
  /** Application name — used as the PM2 process name and directory name */
  appName: string;
  /** Git repository URL to clone/pull from */
  gitRepo?: string;
  /** Git branch to deploy (defaults to 'main') */
  branch?: string;
  /** Script or command to start the application via PM2 */
  startScript: string;
  /** Environment variables to inject into the application */
  envVars?: Record<string, string>;
  /** Build command to run after clone/pull (defaults to 'npm install') */
  buildCommand?: string;
}

/**
 * Process information returned from PM2 queries.
 */
export interface PM2ProcessInfo {
  /** Process name */
  name: string;
  /** PM2 internal process ID */
  pm_id: number;
  /** Current process status (e.g., 'online', 'stopped', 'errored') */
  status: string;
  /** CPU usage percentage */
  cpu: number;
  /** Memory usage in bytes */
  memory: number;
  /** Process uptime in milliseconds */
  uptime: number;
  /** Number of unstable restarts */
  restarts: number;
}

/**
 * File system entry returned by directory listing.
 */
export interface FileEntry {
  /** File or directory name */
  name: string;
  /** Entry type: 'file' or 'directory' */
  type: 'file' | 'directory';
  /** Size in bytes (0 for directories) */
  size: number;
  /** Unix permissions string (e.g., '755') */
  permissions: string;
  /** Last modified ISO timestamp */
  modified: string;
}

/**
 * Terminal PTY session configuration.
 */
export interface TerminalSession {
  /** Unique session identifier */
  id: string;
  /** Shell executable path */
  shell: string;
  /** Terminal columns */
  cols: number;
  /** Terminal rows */
  rows: number;
}
