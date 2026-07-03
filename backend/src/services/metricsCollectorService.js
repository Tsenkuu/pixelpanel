import db from '../repositories/db.js';
import { SystemService } from './systemService.js';

export class MetricsCollectorService {
    static interval = null;
    static cleanupInterval = null;

    /**
     * Start the metrics daemon.
     */
    static start() {
        console.log('[MetricsCollector] Daemon started. Collecting every 10s.');
        
        // Collect every 10 seconds
        this.interval = setInterval(() => this.collect(), 10000);
        
        // Prune data older than 30 days every hour to save space
        // For the high-res 10s data, we'll keep 24h, and maybe aggregate later.
        // For simplicity right now and because SQLite is very efficient, 
        // we'll keep 30 days of 10s tick data, which is only ~250k rows (very small for SQLite, ~10MB).
        this.cleanupInterval = setInterval(() => this.prune(), 60 * 60 * 1000);
        
        // Run immediately
        this.collect();
    }

    static stop() {
        if (this.interval) clearInterval(this.interval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    }

    static async collect() {
        try {
            const stats = await SystemService.getRealtimeStats();
            
            const stmt = db.prepare(`
                INSERT INTO metrics (
                    cpu_load, ram_used, ram_total, swap_used, swap_total,
                    disk_used, disk_total, temp_main, net_rx, net_tx
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                stats.cpu.currentLoad,
                stats.memory.active,
                stats.memory.total,
                stats.memory.swapused,
                stats.memory.swaptotal,
                stats.fsSize[0]?.used || 0,
                stats.fsSize[0]?.size || 0,
                stats.cpuTemperature.main || 0,
                stats.networkStats[0]?.rx_bytes || 0,
                stats.networkStats[0]?.tx_bytes || 0
            );
        } catch (e) {
            console.error('[MetricsCollector] Failed to collect metrics:', e.message);
        }
    }

    static prune() {
        try {
            // Keep exactly 30 days of data.
            // 30 days = 2,592,000 seconds
            const result = db.prepare(`DELETE FROM metrics WHERE timestamp < datetime('now', '-30 days')`).run();
            if (result.changes > 0) {
                console.log(`[MetricsCollector] Pruned ${result.changes} old metric rows.`);
            }
        } catch (e) {
            console.error('[MetricsCollector] Failed to prune metrics:', e.message);
        }
    }
}
