import si from 'systeminformation';

const MAX_HISTORY = 60; // Keep last 60 seconds of data

export class SystemService {
    static history = {
        cpu: [],
        ram: [],
        labels: [] // timestamps
    };

    /**
     * Get real-time system stats and maintain history buffer
     */
    static async getRealtimeStats() {
        try {
            // Wrap each call individually because 'systeminformation' library might crash internally on some OS
            const safeSi = async (fn, defaultVal) => {
                try { return await fn(); } catch (e) { return defaultVal; }
            };

            const [cpu, mem, os, currentLoad, fsSize, networkStats] = await Promise.all([
                safeSi(() => si.cpu(), {}),
                safeSi(() => si.mem(), { active: 0, total: 1, free: 0, used: 0 }),
                safeSi(() => si.osInfo(), {}),
                safeSi(() => si.currentLoad(), { currentLoad: 0 }),
                safeSi(() => si.fsSize(), []),
                safeSi(() => si.networkStats(), [])
            ]);

            const now = new Date().toLocaleTimeString();
            const cpuLoad = parseFloat(currentLoad.currentLoad.toFixed(2));
            const ramUsage = parseFloat(((mem.active / mem.total) * 100).toFixed(2));

            // Update History Buffer
            this.history.labels.push(now);
            this.history.cpu.push(cpuLoad);
            this.history.ram.push(ramUsage);

            if (this.history.labels.length > MAX_HISTORY) {
                this.history.labels.shift();
                this.history.cpu.shift();
                this.history.ram.shift();
            }

            return {
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    cores: cpu.cores,
                    speed: cpu.speed,
                    load: cpuLoad,
                },
                memory: {
                    total: mem.total,
                    free: mem.free,
                    used: mem.used,
                    active: mem.active,
                    usagePercent: ramUsage
                },
                storage: fsSize.map(disk => ({
                    fs: disk.fs,
                    size: disk.size,
                    used: disk.used,
                    usePercent: disk.use
                })),
                network: networkStats.map(net => ({
                    iface: net.iface,
                    rx_sec: net.rx_sec,
                    tx_sec: net.tx_sec
                })),
                os: {
                    platform: os.platform,
                    distro: os.distro,
                    release: os.release,
                    uptime: si.time().uptime
                },
                history: this.history
            };
        } catch (error) {
            console.error('[SystemService] Error fetching stats:', error);
            throw error;
        }
    }
}
