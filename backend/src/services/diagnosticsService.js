import { SystemService } from './systemService.js';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export class DiagnosticsService {
    /**
     * Gathers a comprehensive snapshot of the server's current state
     * to provide context to the AI.
     */
    static async getSystemContext(appName = null) {
        try {
            // Get live hardware stats
            const sysStats = await SystemService.getRealtimeStats();
            
            // Format basic system string
            let context = `--- SYSTEM STATE ---\n`;
            context += `OS: ${sysStats.os.distro} (${sysStats.os.platform})\n`;
            context += `Uptime: ${sysStats.os.uptime}s\n`;
            context += `CPU Load: ${sysStats.cpu.load}%\n`;
            context += `RAM Usage: ${sysStats.memory.usagePercent}% (${(sysStats.memory.used/1024/1024).toFixed(0)}MB / ${(sysStats.memory.total/1024/1024).toFixed(0)}MB)\n\n`;

            // If a specific app is targeted, grab its logs
            if (appName) {
                context += `--- APP: ${appName} ---\n`;
                const pm2Logs = await this.tailLogs(path.join(process.env.HOME || '/root', '.pm2', 'logs', `${appName}-out.log`), 50);
                const pm2Errors = await this.tailLogs(path.join(process.env.HOME || '/root', '.pm2', 'logs', `${appName}-error.log`), 50);
                const nginxErrors = await this.tailLogs('/var/log/nginx/error.log', 20);

                context += `[PM2 STDOUT - Last 50 lines]\n${pm2Logs}\n\n`;
                context += `[PM2 STDERR - Last 50 lines]\n${pm2Errors}\n\n`;
                context += `[NGINX ERRORS - Last 20 lines]\n${nginxErrors}\n\n`;
            }

            return context;
        } catch (error) {
            console.error('[DiagnosticsService] Context gathering failed:', error);
            return `Error gathering system context: ${error.message}`;
        }
    }

    /**
     * Efficiently reads the end of a file without loading it all into memory
     */
    static async tailLogs(filePath, lines = 50) {
        try {
            // Using native tail is extremely fast and memory efficient on Linux
            const { stdout } = await execPromise(`tail -n ${lines} "${filePath}" 2>/dev/null || echo "Log file not found or empty."`);
            return stdout.trim() || 'No recent logs.';
        } catch (err) {
            return `Unable to read logs at ${filePath}`;
        }
    }
}
