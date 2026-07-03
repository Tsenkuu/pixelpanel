import os from 'os';
import pty from 'node-pty';
import { FilesService } from './filesService.js';
import { SecurityService } from './securityService.js';

export class TerminalService {
    static terminals = {};

    /**
     * Spawns a PTY shell specifically bound to the isolated sandbox user.
     * Prevents root access.
     */
    static spawnTerminal(appId, socket) {
        try {
            const { workspacePath, sandboxUser } = FilesService.resolveSecurePath(appId, '/');

            // Command to run bash as the sandbox user
            // We use 'sudo -u' or 'su' since the backend runs as root but must drop privileges
            const shell = 'sudo';
            const args = ['-u', sandboxUser, 'bash'];

            const ptyProcess = pty.spawn(shell, args, {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: workspacePath,
                env: {
                    ...process.env,
                    USER: sandboxUser,
                    HOME: workspacePath,
                    // Wipe dangerous env vars
                    SUDO_USER: undefined,
                    SUDO_UID: undefined
                }
            });

            this.terminals[socket.id] = ptyProcess;

            // Pipe PTY output to WebSocket
            ptyProcess.onData(function(data) {
                socket.emit('terminal:data', data);
            });

            // Pipe WebSocket input to PTY
            socket.on('terminal:input', function(msg) {
                ptyProcess.write(msg);
            });

            // Handle Resize
            socket.on('terminal:resize', function(size) {
                if (size && size.cols && size.rows) {
                    ptyProcess.resize(size.cols, size.rows);
                }
            });

            socket.on('disconnect', () => {
                this.killTerminal(socket.id);
            });

            SecurityService.logAction('terminal_spawned', 'admin', socket.handshake.address, `Spawned terminal for ${sandboxUser}`);

        } catch (error) {
            console.error('[Terminal] Failed to spawn:', error);
            socket.emit('terminal:data', `\r\nError: ${error.message}\r\n`);
            socket.disconnect();
        }
    }

    static killTerminal(socketId) {
        if (this.terminals[socketId]) {
            try {
                this.terminals[socketId].kill();
            } catch (e) {}
            delete this.terminals[socketId];
        }
    }
}
