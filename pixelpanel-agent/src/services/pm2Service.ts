/**
 * @module pm2Service
 * @description PM2 process manager wrapper providing async methods for
 * process lifecycle management: list, start, stop, restart, reload, delete, logs, and metrics.
 * Uses the PM2 programmatic API with connect/disconnect patterns.
 */

import pm2 from 'pm2';
import type { PM2ProcessInfo } from '../types.js';

/**
 * Wraps the PM2 programmatic API in promise-based async methods.
 * Each operation connects to the PM2 daemon, performs the action, and disconnects.
 */
export class PM2Service {
  /**
   * Connects to the PM2 daemon.
   * @returns A promise that resolves when connected
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          reject(new Error(`[PM2Service] Connection failed: ${err.message}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Disconnects from the PM2 daemon.
   */
  private disconnect(): void {
    pm2.disconnect();
  }

  /**
   * Executes a PM2 operation within a connect/disconnect lifecycle.
   * Ensures the daemon connection is always properly cleaned up.
   *
   * @param operation - Async function to execute while connected
   * @returns The result of the operation
   */
  private async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    await this.connect();
    try {
      return await operation();
    } finally {
      this.disconnect();
    }
  }

  /**
   * Maps a raw PM2 process description to a typed PM2ProcessInfo object.
   *
   * @param proc - Raw PM2 process description
   * @returns Typed process info
   */
  private mapProcess(proc: pm2.ProcessDescription): PM2ProcessInfo {
    const env = proc.pm2_env as any;
    return {
      name: proc.name || 'unknown',
      pm_id: proc.pm_id ?? -1,
      status: env?.status || 'unknown',
      cpu: proc.monit?.cpu ?? 0,
      memory: proc.monit?.memory ?? 0,
      uptime: env?.pm_uptime ? Date.now() - env.pm_uptime : 0,
      restarts: env?.unstable_restarts ?? env?.restart_time ?? 0,
    };
  }

  /**
   * Lists all PM2 managed processes.
   *
   * @returns Array of PM2ProcessInfo for all managed processes
   */
  async list(): Promise<PM2ProcessInfo[]> {
    return this.withConnection(() => {
      return new Promise<PM2ProcessInfo[]>((resolve, reject) => {
        pm2.list((err, list) => {
          if (err) {
            reject(new Error(`[PM2Service] list failed: ${err.message}`));
            return;
          }
          resolve(list.map((proc) => this.mapProcess(proc)));
        });
      });
    });
  }

  /**
   * Starts a new PM2 process.
   *
   * @param name - Process name identifier
   * @param script - Script path or command to execute
   * @param cwd - Working directory for the process
   * @param env - Optional environment variables
   * @returns The started process info
   */
  async start(
    name: string,
    script: string,
    cwd: string,
    env?: Record<string, string>
  ): Promise<PM2ProcessInfo> {
    return this.withConnection(() => {
      return new Promise<PM2ProcessInfo>((resolve, reject) => {
        pm2.start(
          {
            name,
            script,
            cwd,
            env: env as any,
            autorestart: true,
            max_memory_restart: '150M',
          },
          (err, proc) => {
            if (err) {
              reject(new Error(`[PM2Service] start '${name}' failed: ${err.message}`));
              return;
            }
            // proc can be an array or single ProcessDescription
            const processDesc = Array.isArray(proc) ? proc[0] : proc;
            resolve(this.mapProcess(processDesc as pm2.ProcessDescription));
          }
        );
      });
    });
  }

  /**
   * Stops a PM2 managed process.
   *
   * @param name - Process name or PM2 ID
   * @returns The stopped process info
   */
  async stop(name: string): Promise<PM2ProcessInfo> {
    return this.withConnection(() => {
      return new Promise<PM2ProcessInfo>((resolve, reject) => {
        pm2.stop(name, (err, proc) => {
          if (err) {
            reject(new Error(`[PM2Service] stop '${name}' failed: ${err.message}`));
            return;
          }
          const processDesc = Array.isArray(proc) ? proc[0] : proc;
          resolve(this.mapProcess(processDesc as pm2.ProcessDescription));
        });
      });
    });
  }

  /**
   * Restarts a PM2 managed process (full stop + start).
   *
   * @param name - Process name or PM2 ID
   * @returns The restarted process info
   */
  async restart(name: string): Promise<PM2ProcessInfo> {
    return this.withConnection(() => {
      return new Promise<PM2ProcessInfo>((resolve, reject) => {
        pm2.restart(name, (err, proc) => {
          if (err) {
            reject(new Error(`[PM2Service] restart '${name}' failed: ${err.message}`));
            return;
          }
          const processDesc = Array.isArray(proc) ? proc[0] : proc;
          resolve(this.mapProcess(processDesc as pm2.ProcessDescription));
        });
      });
    });
  }

  /**
   * Gracefully reloads a PM2 managed process (zero-downtime restart).
   *
   * @param name - Process name or PM2 ID
   * @returns The reloaded process info
   */
  async reload(name: string): Promise<PM2ProcessInfo> {
    return this.withConnection(() => {
      return new Promise<PM2ProcessInfo>((resolve, reject) => {
        pm2.reload(name, (err, proc) => {
          if (err) {
            reject(new Error(`[PM2Service] reload '${name}' failed: ${err.message}`));
            return;
          }
          const processDesc = Array.isArray(proc) ? proc[0] : proc;
          resolve(this.mapProcess(processDesc as pm2.ProcessDescription));
        });
      });
    });
  }

  /**
   * Deletes a PM2 managed process (stops and removes from PM2 list).
   *
   * @param name - Process name or PM2 ID
   * @returns The deleted process info
   */
  async deletePm2(name: string): Promise<PM2ProcessInfo> {
    return this.withConnection(() => {
      return new Promise<PM2ProcessInfo>((resolve, reject) => {
        pm2.delete(name, (err, proc) => {
          if (err) {
            reject(new Error(`[PM2Service] delete '${name}' failed: ${err.message}`));
            return;
          }
          const processDesc = Array.isArray(proc) ? proc[0] : proc;
          resolve(this.mapProcess(processDesc as pm2.ProcessDescription));
        });
      });
    });
  }

  /**
   * Retrieves recent log lines for a PM2 process.
   * Reads from PM2's log files directly for the specified process.
   *
   * @param name - Process name
   * @param lines - Number of lines to retrieve (default 50)
   * @returns Combined stdout and stderr log output
   */
  async logs(name: string, lines: number = 50): Promise<string> {
    return this.withConnection(async () => {
      // Get process info to find log file paths
      const processList = await new Promise<pm2.ProcessDescription[]>((resolve, reject) => {
        pm2.describe(name, (err, desc) => {
          if (err) {
            reject(new Error(`[PM2Service] describe '${name}' failed: ${err.message}`));
            return;
          }
          resolve(desc);
        });
      });

      if (!processList || processList.length === 0) {
        throw new Error(`[PM2Service] Process '${name}' not found`);
      }

      const proc = processList[0];
      const env = proc.pm2_env as any;
      const outLogPath: string = env?.pm_out_log_path || '';
      const errLogPath: string = env?.pm_err_log_path || '';

      const { readFile } = await import('node:fs/promises');
      const output: string[] = [];

      // Read stdout log
      if (outLogPath) {
        try {
          const content = await readFile(outLogPath, 'utf-8');
          const logLines = content.trim().split('\n');
          const tailLines = logLines.slice(-lines);
          if (tailLines.length > 0) {
            output.push('--- stdout ---', ...tailLines);
          }
        } catch {
          // Log file may not exist yet
        }
      }

      // Read stderr log
      if (errLogPath) {
        try {
          const content = await readFile(errLogPath, 'utf-8');
          const logLines = content.trim().split('\n');
          const tailLines = logLines.slice(-lines);
          if (tailLines.length > 0) {
            output.push('--- stderr ---', ...tailLines);
          }
        } catch {
          // Log file may not exist yet
        }
      }

      return output.join('\n');
    });
  }

  /**
   * Retrieves runtime metrics for a specific PM2 process.
   *
   * @param name - Process name
   * @returns Process metrics including CPU, memory, uptime, and restart count
   */
  async metrics(name: string): Promise<PM2ProcessInfo> {
    return this.withConnection(async () => {
      const processList = await new Promise<pm2.ProcessDescription[]>((resolve, reject) => {
        pm2.describe(name, (err, desc) => {
          if (err) {
            reject(new Error(`[PM2Service] describe '${name}' failed: ${err.message}`));
            return;
          }
          resolve(desc);
        });
      });

      if (!processList || processList.length === 0) {
        throw new Error(`[PM2Service] Process '${name}' not found`);
      }

      return this.mapProcess(processList[0]);
    });
  }
}
