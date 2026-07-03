import db from '../repositories/db.js';

export class MetricsController {
    /**
     * Fetch historical metrics based on range.
     * Ranges: 1h, 24h, 7d, 30d
     */
    static getHistory(req, res) {
        const { range = '1h' } = req.query;
        let timeModifier = '-1 hours';
        let limit = 360; // 1h of 10s ticks

        if (range === '24h') { timeModifier = '-24 hours'; limit = 8640; }
        if (range === '7d') { timeModifier = '-7 days'; limit = 60480; }
        if (range === '30d') { timeModifier = '-30 days'; limit = 259200; }

        try {
            // Because SQLite is fast, we can just grab everything in that time window.
            // In a heavily scaled setup, we would average these points down to a smaller array (e.g. 100 points) to avoid transferring megabytes of JSON.
            // For PixelPanel, we'll downsample efficiently in SQL by grouping.
            
            let query = `SELECT * FROM metrics WHERE timestamp >= datetime('now', ?) ORDER BY timestamp ASC`;
            
            // If range is large (7d or 30d), we downsample to 1 hour averages so the frontend doesn't crash processing 250k points
            if (range === '7d' || range === '30d') {
                query = `
                    SELECT 
                        strftime('%Y-%m-%d %H:00:00', timestamp) as timestamp,
                        AVG(cpu_load) as cpu_load,
                        AVG(ram_used) as ram_used,
                        AVG(ram_total) as ram_total,
                        AVG(swap_used) as swap_used,
                        AVG(swap_total) as swap_total,
                        AVG(disk_used) as disk_used,
                        AVG(disk_total) as disk_total,
                        AVG(temp_main) as temp_main,
                        AVG(net_rx) as net_rx,
                        AVG(net_tx) as net_tx
                    FROM metrics 
                    WHERE timestamp >= datetime('now', ?) 
                    GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp)
                    ORDER BY timestamp ASC
                `;
            } else if (range === '24h') {
                // Downsample to 10 minute averages
                query = `
                    SELECT 
                        strftime('%Y-%m-%d %H:', timestamp) || (cast(strftime('%M', timestamp) as integer) / 10 * 10) || ':00' as timestamp,
                        AVG(cpu_load) as cpu_load,
                        AVG(ram_used) as ram_used,
                        AVG(ram_total) as ram_total,
                        AVG(swap_used) as swap_used,
                        AVG(swap_total) as swap_total,
                        AVG(disk_used) as disk_used,
                        AVG(disk_total) as disk_total,
                        AVG(temp_main) as temp_main,
                        AVG(net_rx) as net_rx,
                        AVG(net_tx) as net_tx
                    FROM metrics 
                    WHERE timestamp >= datetime('now', ?) 
                    GROUP BY strftime('%Y-%m-%d %H:', timestamp) || (cast(strftime('%M', timestamp) as integer) / 10 * 10) || ':00'
                    ORDER BY timestamp ASC
                `;
            }

            const data = db.prepare(query).all(timeModifier);
            res.json(data);
        } catch (error) {
            console.error('[Metrics] DB Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Export raw metrics data to CSV or JSON
     */
    static exportData(req, res) {
        const { format = 'json', range = '24h' } = req.query;
        let timeModifier = '-24 hours';
        if (range === '7d') timeModifier = '-7 days';
        if (range === '30d') timeModifier = '-30 days';

        try {
            const data = db.prepare(`SELECT * FROM metrics WHERE timestamp >= datetime('now', ?) ORDER BY timestamp ASC`).all(timeModifier);
            
            if (format === 'csv') {
                let csv = 'timestamp,cpu_load,ram_used,ram_total,swap_used,swap_total,disk_used,disk_total,temp_main,net_rx,net_tx\n';
                data.forEach(row => {
                    csv += `${row.timestamp},${row.cpu_load},${row.ram_used},${row.ram_total},${row.swap_used},${row.swap_total},${row.disk_used},${row.disk_total},${row.temp_main},${row.net_rx},${row.net_tx}\n`;
                });
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="pixelpanel_metrics_${range}.csv"`);
                return res.send(csv);
            }

            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="pixelpanel_metrics_${range}.json"`);
            return res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
