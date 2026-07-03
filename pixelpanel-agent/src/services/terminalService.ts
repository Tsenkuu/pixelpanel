/**
 * @module terminalService
 * @description Manages pseudo-terminal (PTY) sessions using node-pty.
 * Provides session lifecycle management: spawn, input, resize, close.
 * Each session is identified by a unique session ID and stored in an in-memory map.
 */

import * as pty from 'node-pty';
import os from 'node:os';

/** Callback type for receiving PTY output data */
type DataCallback = (data: string) => void;

/** Callback type for receiving PTY exit events */
type ExitCallback = (exitCode: number, signal?: number) => void;

/**
 * Managed PTY session wrapper with event registration.
 */
interface ManagedSession {
  /** The underlying node-pty process */
  process: pty.IPty;
  /** Data output listeners */
  dataListeners: DataCallback[];
  /** Exit event listeners */
  exitListeners: ExitCallback[];
}

/**
 * Service for managing interactive PTY terminal sessions.
 * Supports multiple concurrent sessions identified by unique IDs.
 */
export class TerminalService {
  /** Map of active PTY sessions keyed by session ID */
  private sessions: Map<string, ManagedSession> = new Map();

  /**
   * Returns the default shell for the current platform.
   *
   * @returns Shell executable path
   */
  private getDefaultShell(): string {
    if (os.platform() === 'win32') {
      return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * Spawns a new PTY session with the specified parameters.
   *
   * @param id - Unique session identifier
   * @param shell - Shell executable to spawn (defaults to platform default)
   * @param cols - Terminal width in columns (default 80)
   * @param rows - Terminal height in rows (default 24)
   * @returns Object with methods to register onData and onExit callbacks
   * @throws If a session with the given ID already exists
   */
  spawn(
    id: string,
    shell?: string,
    cols: number = 80,
    rows: number = 24
  ): { onData: (cb: DataCallback) => void; onExit: (cb: ExitCallback) => void } {
    if (this.sessions.has(id)) {
      throw new Error(`[TerminalService] Session '${id}' already exists`);
    }

    const shellExe = shell || this.getDefaultShell();

    const ptyProcess = pty.spawn(shellExe, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: os.homedir(),
      env: process.env as Record<string, string>,
    });

    const session: ManagedSession = {
      process: ptyProcess,
      dataListeners: [],
      exitListeners: [],
    };

    // Wire up the PTY data event to all registered listeners
    ptyProcess.onData((data: string) => {
      for (const listener of session.dataListeners) {
        try {
          listener(data);
        } catch {
          // Prevent listener errors from crashing the PTY
        }
      }
    });

    // Wire up the PTY exit event to all registered listeners
    ptyProcess.onExit(({ exitCode, signal }) => {
      for (const listener of session.exitListeners) {
        try {
          listener(exitCode, signal);
        } catch {
          // Prevent listener errors from crashing cleanup
        }
      }
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);

    return {
      onData: (cb: DataCallback) => {
        session.dataListeners.push(cb);
      },
      onExit: (cb: ExitCallback) => {
        session.exitListeners.push(cb);
      },
    };
  }

  /**
   * Sends input data to a PTY session's stdin.
   *
   * @param id - Session identifier
   * @param data - String data to write to the PTY stdin
   * @throws If the session does not exist
   */
  input(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`[TerminalService] Session '${id}' not found`);
    }
    session.process.write(data);
  }

  /**
   * Resizes a PTY session's terminal dimensions.
   *
   * @param id - Session identifier
   * @param cols - New terminal width in columns
   * @param rows - New terminal height in rows
   * @throws If the session does not exist
   */
  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`[TerminalService] Session '${id}' not found`);
    }
    session.process.resize(cols, rows);
  }

  /**
   * Closes and kills a PTY session.
   *
   * @param id - Session identifier
   * @throws If the session does not exist
   */
  close(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`[TerminalService] Session '${id}' not found`);
    }
    session.process.kill();
    this.sessions.delete(id);
  }

  /**
   * Closes all active PTY sessions. Used for graceful shutdown cleanup.
   */
  closeAll(): void {
    for (const [id, session] of this.sessions) {
      try {
        session.process.kill();
      } catch {
        // Best-effort cleanup
      }
    }
    this.sessions.clear();
  }

  /**
   * Returns the number of active PTY sessions.
   *
   * @returns Count of active sessions
   */
  getActiveCount(): number {
    return this.sessions.size;
  }

  /**
   * Checks if a session with the given ID exists and is active.
   *
   * @param id - Session identifier to check
   * @returns True if the session exists
   */
  hasSession(id: string): boolean {
    return this.sessions.has(id);
  }
}
