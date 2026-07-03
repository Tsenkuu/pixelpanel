/**
 * @module metricsService
 * @description System metrics collector using the systeminformation library.
 * Gathers CPU, memory, disk, temperature, network, and process data.
 * Optimized for lightweight operation on ARM64 devices.
 */

import si from 'systeminformation';
import os from 'node:os';
import type { NodeMetrics, DiskInfo } from '../types.js';

/**
 * Service responsible for collecting comprehensive system metrics.
 * Uses the systeminformation library for cross-platform compatibility.
 */
export class MetricsService {
  /** Cached previous network stats for delta calculation */
  private previousNetRx: number = 0;
  private previousNetTx: number = 0;
  private previousNetTimestamp: number = 0;

  /**
   * Collects a full snapshot of system metrics.
   * Gathers CPU load, memory usage, disk info, temperature,
   * swap, network throughput, load averages, and process counts.
   *
   * @returns A promise resolving to a complete NodeMetrics snapshot
   */
  async collectMetrics(): Promise<NodeMetrics> {
    try {
      const [
        cpuLoad,
        cpuInfo,
        mem,
        disks,
        temp,
        networkStats,
        processes,
      ] = await Promise.all([
        si.currentLoad(),
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.cpuTemperature(),
        si.networkStats(),
        si.processes(),
      ]);

      // Calculate network throughput (bytes/sec) using delta from previous sample
      const now = Date.now();
      const totalRx = networkStats.reduce((sum, iface) => sum + iface.rx_bytes, 0);
      const totalTx = networkStats.reduce((sum, iface) => sum + iface.tx_bytes, 0);

      let rxPerSec = 0;
      let txPerSec = 0;

      if (this.previousNetTimestamp > 0) {
        const elapsed = (now - this.previousNetTimestamp) / 1000;
        if (elapsed > 0) {
          rxPerSec = Math.max(0, (totalRx - this.previousNetRx) / elapsed);
          txPerSec = Math.max(0, (totalTx - this.previousNetTx) / elapsed);
        }
      }

      this.previousNetRx = totalRx;
      this.previousNetTx = totalTx;
      this.previousNetTimestamp = now;

      // Map disk partitions to DiskInfo
      const diskInfo: DiskInfo[] = disks.map((d) => ({
        fs: d.fs,
        mount: d.mount,
        type: d.type,
        size: d.size,
        used: d.used,
        available: d.available,
        use: d.use,
      }));

      // OS load averages: [1min, 5min, 15min]
      const loadAvg = os.loadavg() as [number, number, number];

      return {
        cpu: {
          load: Math.round(cpuLoad.currentLoad * 100) / 100,
          cores: cpuInfo.cores,
          speed: cpuInfo.speed,
        },
        ram: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
        },
        disk: diskInfo,
        temperature: temp.main !== null && temp.main !== -1 ? temp.main : null,
        swap: {
          total: mem.swaptotal,
          used: mem.swapused,
          free: mem.swapfree,
        },
        network: {
          rx: Math.round(rxPerSec),
          tx: Math.round(txPerSec),
        },
        loadAvg: [
          Math.round(loadAvg[0] * 100) / 100,
          Math.round(loadAvg[1] * 100) / 100,
          Math.round(loadAvg[2] * 100) / 100,
        ],
        processes: {
          total: processes.all,
          running: processes.running,
        },
        uptime: Math.floor(os.uptime()),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[MetricsService] Failed to collect metrics: ${message}`);
    }
  }
}
