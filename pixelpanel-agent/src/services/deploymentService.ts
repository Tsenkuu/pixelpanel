/**
 * @module deploymentService
 * @description Application deployment service handling git clone/pull,
 * build execution, and PM2 process management. Supports rollback to
 * previous versions by maintaining versioned deployment directories.
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { mkdir, rename, rm, access, cp } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { PM2Service } from './pm2Service.js';
import type { DeploymentConfig } from '../types.js';

const execAsync = promisify(exec);

/** Base directory for deployed applications */
const APPS_BASE_DIR = '/home/pxl_apps';

/**
 * Service for deploying, building, and managing application versions.
 * Maintains current and previous versions for rollback support.
 */
export class DeploymentService {
  /** PM2 service instance for process lifecycle management */
  private pm2Service: PM2Service;

  /**
   * Creates a new DeploymentService instance.
   *
   * @param pm2Service - PM2Service instance for managing application processes
   */
  constructor(pm2Service: PM2Service) {
    this.pm2Service = pm2Service;
  }

  /**
   * Returns the application directory path.
   *
   * @param appName - Application name
   * @returns Absolute path to the application directory
   */
  private getAppDir(appName: string): string {
    return join(APPS_BASE_DIR, appName);
  }

  /**
   * Returns the current deployment path for an application.
   *
   * @param appName - Application name
   * @returns Absolute path to the current version directory
   */
  private getCurrentDir(appName: string): string {
    return join(APPS_BASE_DIR, appName, 'current');
  }

  /**
   * Returns the previous deployment path for an application.
   *
   * @param appName - Application name
   * @returns Absolute path to the previous version directory
   */
  private getPreviousDir(appName: string): string {
    return join(APPS_BASE_DIR, appName, 'previous');
  }

  /**
   * Checks if a directory exists and is accessible.
   *
   * @param dir - Directory path to check
   * @returns True if the directory exists
   */
  private async dirExists(dir: string): Promise<boolean> {
    try {
      await access(dir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executes a shell command in a working directory and captures output.
   *
   * @param command - Command string to execute
   * @param cwd - Working directory
   * @returns Object with stdout and stderr output
   */
  private async runCommand(
    command: string,
    cwd: string
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 300_000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB output buffer
      });
      return { stdout, stderr };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      };
    }
  }

  /**
   * Executes a full deployment for the given configuration.
   *
   * Deployment steps:
   * 1. Create app directory structure
   * 2. Back up current version to 'previous' (if exists)
   * 3. Clone or pull from git repository (if gitRepo specified)
   * 4. Run build command (defaults to 'npm install')
   * 5. Start/restart the application via PM2
   *
   * @param config - Deployment configuration
   * @returns Deployment log output documenting each step
   * @throws If critical deployment steps fail
   */
  async execute(config: DeploymentConfig): Promise<string> {
    const logs: string[] = [];
    const timestamp = new Date().toISOString();
    logs.push(`[Deploy] Starting deployment of '${config.appName}' at ${timestamp}`);

    const appDir = this.getAppDir(config.appName);
    const currentDir = this.getCurrentDir(config.appName);
    const previousDir = this.getPreviousDir(config.appName);
    const branch = config.branch || 'main';
    const buildCommand = config.buildCommand || 'npm install';

    try {
      // Step 1: Ensure app base directory exists
      await mkdir(appDir, { recursive: true });
      logs.push(`[Deploy] App directory ensured: ${appDir}`);

      // Step 2: Backup current to previous (for rollback)
      if (await this.dirExists(currentDir)) {
        logs.push('[Deploy] Backing up current version to previous...');

        // Remove old previous if it exists
        if (await this.dirExists(previousDir)) {
          await rm(previousDir, { recursive: true, force: true });
        }

        // Copy current to previous
        await cp(currentDir, previousDir, { recursive: true });
        logs.push('[Deploy] Backup completed');
      }

      // Step 3: Clone or pull from git repository
      if (config.gitRepo) {
        if (await this.dirExists(currentDir)) {
          // Pull latest changes
          logs.push(`[Deploy] Pulling latest from branch '${branch}'...`);
          const git: SimpleGit = simpleGit(currentDir);

          try {
            await git.fetch('origin');
            await git.checkout(branch);
            await git.pull('origin', branch);
            logs.push('[Deploy] Git pull completed');
          } catch (gitError) {
            // If pull fails, try fresh clone
            logs.push('[Deploy] Git pull failed, performing fresh clone...');
            await rm(currentDir, { recursive: true, force: true });
            await mkdir(currentDir, { recursive: true });
            const freshGit: SimpleGit = simpleGit();
            await freshGit.clone(config.gitRepo, currentDir, ['--branch', branch, '--depth', '1']);
            logs.push('[Deploy] Fresh clone completed');
          }
        } else {
          // Fresh clone
          logs.push(`[Deploy] Cloning repository to ${currentDir}...`);
          await mkdir(currentDir, { recursive: true });
          const git: SimpleGit = simpleGit();
          await git.clone(config.gitRepo, currentDir, ['--branch', branch, '--depth', '1']);
          logs.push('[Deploy] Clone completed');
        }
      } else {
        // No git repo — ensure directory exists for manual deployments
        if (!(await this.dirExists(currentDir))) {
          await mkdir(currentDir, { recursive: true });
        }
        logs.push('[Deploy] No git repository configured, using existing files');
      }

      // Step 4: Run build command
      logs.push(`[Deploy] Running build command: ${buildCommand}`);
      const buildResult = await this.runCommand(buildCommand, currentDir);

      if (buildResult.stdout) {
        // Truncate build output to last 50 lines to keep logs manageable
        const buildLines = buildResult.stdout.trim().split('\n');
        const tailLines = buildLines.slice(-50);
        logs.push(`[Deploy] Build stdout (last ${tailLines.length} lines):`);
        logs.push(...tailLines);
      }

      if (buildResult.stderr) {
        const stderrLines = buildResult.stderr.trim().split('\n').slice(-20);
        logs.push(`[Deploy] Build stderr (last ${stderrLines.length} lines):`);
        logs.push(...stderrLines);
      }

      // Step 5: Start or restart the application via PM2
      logs.push(`[Deploy] Starting application via PM2...`);

      try {
        // Try to restart if already running
        await this.pm2Service.restart(config.appName);
        logs.push('[Deploy] Application restarted successfully');
      } catch {
        // Not running yet — start fresh
        try {
          await this.pm2Service.start(
            config.appName,
            config.startScript,
            currentDir,
            config.envVars
          );
          logs.push('[Deploy] Application started successfully');
        } catch (startError) {
          const message = startError instanceof Error ? startError.message : String(startError);
          logs.push(`[Deploy] ERROR: Failed to start application: ${message}`);
          throw startError;
        }
      }

      logs.push(`[Deploy] Deployment of '${config.appName}' completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logs.push(`[Deploy] FATAL: Deployment failed: ${message}`);
      throw new Error(logs.join('\n'));
    }

    return logs.join('\n');
  }

  /**
   * Rolls back an application to its previous version.
   *
   * Rollback steps:
   * 1. Stop the currently running process via PM2
   * 2. Swap current and previous directories
   * 3. Restart the application from the restored version
   *
   * @param appName - Name of the application to roll back
   * @returns Rollback log output documenting each step
   * @throws If no previous version exists or rollback fails
   */
  async rollback(appName: string): Promise<string> {
    const logs: string[] = [];
    const timestamp = new Date().toISOString();
    logs.push(`[Rollback] Starting rollback of '${appName}' at ${timestamp}`);

    const currentDir = this.getCurrentDir(appName);
    const previousDir = this.getPreviousDir(appName);
    const tempDir = join(this.getAppDir(appName), '_rollback_temp');

    try {
      // Verify previous version exists
      if (!(await this.dirExists(previousDir))) {
        throw new Error(`No previous version available for '${appName}'`);
      }

      // Step 1: Stop the current process
      logs.push('[Rollback] Stopping current process...');
      try {
        await this.pm2Service.stop(appName);
        logs.push('[Rollback] Process stopped');
      } catch {
        logs.push('[Rollback] Process was not running or could not be stopped');
      }

      // Step 2: Swap directories (current <-> previous)
      logs.push('[Rollback] Swapping current and previous versions...');

      // Move current -> temp
      if (await this.dirExists(currentDir)) {
        await rename(currentDir, tempDir);
      }

      // Move previous -> current
      await rename(previousDir, currentDir);

      // Move temp -> previous (so we can roll forward if needed)
      if (await this.dirExists(tempDir)) {
        await rename(tempDir, previousDir);
      }

      logs.push('[Rollback] Directory swap completed');

      // Step 3: Restart the application
      logs.push('[Rollback] Restarting application from restored version...');
      try {
        await this.pm2Service.restart(appName);
        logs.push('[Rollback] Application restarted successfully');
      } catch {
        // If restart fails, try delete + start with previous PM2 config
        try {
          await this.pm2Service.deletePm2(appName);
        } catch {
          // Ignore delete errors
        }
        // We can't auto-start without knowing the script — the master will need to re-deploy
        logs.push('[Rollback] WARNING: Could not auto-restart. Manual PM2 start may be required.');
      }

      logs.push(`[Rollback] Rollback of '${appName}' completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logs.push(`[Rollback] FATAL: Rollback failed: ${message}`);
      throw new Error(logs.join('\n'));
    }

    return logs.join('\n');
  }
}
