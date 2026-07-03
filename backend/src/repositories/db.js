import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure storage directory exists
const storageDir = path.resolve(__dirname, '../../../storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const dbPath = path.join(storageDir, 'pixelpanel.db');
const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Viewer',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Apps table
    db.exec(`
        CREATE TABLE IF NOT EXISTS apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            pm2_name TEXT NOT NULL,
            path TEXT NOT NULL,
            git_repo TEXT,
            branch TEXT DEFAULT 'main',
            status TEXT DEFAULT 'stopped',
            start_script TEXT DEFAULT 'npm start',
            env_vars TEXT DEFAULT '{}',
            memory_limit TEXT DEFAULT '150M',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create Deployments Table for Pipeline & Rollbacks
    db.exec(`CREATE TABLE IF NOT EXISTS deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        commit_hash TEXT,
        commit_message TEXT,
        status TEXT DEFAULT 'pending',
        logs TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        workspace_path TEXT,
        FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    )`);

    // Create Jobs Table for Background Queue
    db.exec(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
        type TEXT DEFAULT 'deploy',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Metrics Table for Historical Monitoring
    db.exec(`CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        cpu_load REAL,
        ram_used REAL,
        ram_total REAL,
        swap_used REAL,
        swap_total REAL,
        disk_used REAL,
        disk_total REAL,
        temp_main REAL,
        net_rx REAL,
        net_tx REAL
    )`);

    // Create Index on timestamp for faster queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);

    // Create Audit Logs Table
    db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        user TEXT DEFAULT 'system',
        ip_address TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create API Keys Table
    db.exec(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);

    // ==========================================
    // Cluster Management Tables
    // ==========================================

    // Registered agent nodes in the cluster
    db.exec(`CREATE TABLE IF NOT EXISTS cluster_nodes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER DEFAULT 3001,
        token TEXT NOT NULL,
        status TEXT DEFAULT 'offline',
        group_name TEXT,
        tags TEXT DEFAULT '[]',
        is_favorite INTEGER DEFAULT 0,
        cpu_cores INTEGER,
        ram_total INTEGER,
        os TEXT,
        arch TEXT,
        agent_version TEXT,
        last_heartbeat DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Cluster deployment records
    db.exec(`CREATE TABLE IF NOT EXISTS cluster_deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        node_id TEXT NOT NULL,
        strategy TEXT DEFAULT 'single',
        status TEXT DEFAULT 'pending',
        logs TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
        FOREIGN KEY (node_id) REFERENCES cluster_nodes(id) ON DELETE CASCADE
    )`);

    // Service discovery registry
    db.exec(`CREATE TABLE IF NOT EXISTS service_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        node_id TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        health_status TEXT DEFAULT 'unknown',
        last_check DATETIME,
        FOREIGN KEY (node_id) REFERENCES cluster_nodes(id) ON DELETE CASCADE
    )`);

    // Databases table
    db.exec(`CREATE TABLE IF NOT EXISTS databases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        host TEXT DEFAULT 'local',
        port INTEGER,
        username TEXT,
        password TEXT,
        status TEXT DEFAULT 'provisioning',
        linked_apps TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Indexes for cluster queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cluster_nodes_status ON cluster_nodes(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cluster_nodes_group ON cluster_nodes(group_name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cluster_deployments_app ON cluster_deployments(app_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_service_registry_app ON service_registry(app_name)`);
    
    console.log('[Database] Initialized SQLite at', dbPath);
}

export default db;
