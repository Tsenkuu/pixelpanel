/**
 * @module fileService
 * @description File system operations service providing directory listing,
 * file read/write, removal, renaming, archiving, extraction, chmod, and stat.
 * Enforces a 5MB read limit to protect memory on constrained ARM64 devices.
 */

import {
  readdir,
  readFile,
  writeFile,
  rm,
  rename as fsRename,
  chmod as fsChmod,
  stat as fsStat,
  mkdir,
} from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import archiver from 'archiver';
import type { FileEntry } from '../types.js';

/** Maximum file read size: 5MB */
const MAX_READ_SIZE = 5 * 1024 * 1024;

/**
 * Service for file system operations with safety limits.
 * Designed for constrained ARM64 edge devices.
 */
export class FileService {
  /**
   * Converts numeric file mode to octal permission string.
   *
   * @param mode - Numeric file mode from fs.Stats
   * @returns Octal permissions string (e.g., '755')
   */
  private modeToPermissions(mode: number): string {
    return (mode & 0o777).toString(8);
  }

  /**
   * Lists contents of a directory with metadata for each entry.
   *
   * @param dir - Absolute path to the directory
   * @returns Array of FileEntry objects with name, type, size, permissions, and modified date
   * @throws If the directory does not exist or is not accessible
   */
  async list(dir: string): Promise<FileEntry[]> {
    const resolvedDir = resolve(dir);
    const entries = await readdir(resolvedDir, { withFileTypes: true });
    const results: FileEntry[] = [];

    for (const entry of entries) {
      try {
        const fullPath = join(resolvedDir, entry.name);
        const stats = await fsStat(fullPath);
        results.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isDirectory() ? 0 : stats.size,
          permissions: this.modeToPermissions(stats.mode),
          modified: stats.mtime.toISOString(),
        });
      } catch {
        // Skip entries we cannot stat (broken symlinks, permission issues)
        results.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: 0,
          permissions: '000',
          modified: new Date(0).toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Reads the content of a file as a UTF-8 string.
   * Enforces a 5MB size limit to protect device memory.
   *
   * @param path - Absolute path to the file
   * @returns File content as a string
   * @throws If the file exceeds 5MB or cannot be read
   */
  async read(path: string): Promise<string> {
    const resolvedPath = resolve(path);
    const stats = await fsStat(resolvedPath);

    if (stats.size > MAX_READ_SIZE) {
      throw new Error(
        `[FileService] File exceeds ${MAX_READ_SIZE / 1024 / 1024}MB limit: ${stats.size} bytes`
      );
    }

    return readFile(resolvedPath, 'utf-8');
  }

  /**
   * Writes string content to a file, creating parent directories as needed.
   *
   * @param path - Absolute path to the file
   * @param content - String content to write
   */
  async write(path: string, content: string): Promise<void> {
    const resolvedPath = resolve(path);
    const dir = resolvedPath.substring(0, resolvedPath.lastIndexOf('/')) ||
                resolvedPath.substring(0, resolvedPath.lastIndexOf('\\'));

    if (dir) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(resolvedPath, content, 'utf-8');
  }

  /**
   * Removes a file or directory recursively.
   *
   * @param path - Absolute path to the file or directory
   */
  async remove(path: string): Promise<void> {
    const resolvedPath = resolve(path);
    await rm(resolvedPath, { recursive: true, force: true });
  }

  /**
   * Renames or moves a file or directory.
   *
   * @param oldPath - Current absolute path
   * @param newPath - Target absolute path
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await fsRename(resolve(oldPath), resolve(newPath));
  }

  /**
   * Creates a ZIP archive of a source file or directory.
   *
   * @param source - Absolute path to the source file or directory
   * @param output - Absolute path for the output ZIP file
   * @returns The size of the created archive in bytes
   */
  async zip(source: string, output: string): Promise<number> {
    const resolvedSource = resolve(source);
    const resolvedOutput = resolve(output);

    return new Promise<number>((zipResolve, reject) => {
      const outputStream = createWriteStream(resolvedOutput);
      const archive = archiver('zip', { zlib: { level: 6 } });

      let archiveSize = 0;

      outputStream.on('close', () => {
        archiveSize = archive.pointer();
        zipResolve(archiveSize);
      });

      archive.on('error', (err: Error) => {
        reject(new Error(`[FileService] Archive creation failed: ${err.message}`));
      });

      outputStream.on('error', (err) => {
        reject(new Error(`[FileService] Output stream error: ${err.message}`));
      });

      archive.pipe(outputStream);

      // Determine if source is file or directory
      fsStat(resolvedSource).then((stats) => {
        if (stats.isDirectory()) {
          archive.directory(resolvedSource, basename(resolvedSource));
        } else {
          archive.file(resolvedSource, { name: basename(resolvedSource) });
        }
        archive.finalize();
      }).catch(reject);
    });
  }

  /**
   * Extracts a .tar.gz archive to a target directory.
   * Uses native Node.js streams for memory efficiency.
   *
   * @param archive - Absolute path to the .tar.gz archive
   * @param target - Absolute path to the extraction target directory
   */
  async extract(archive: string, target: string): Promise<void> {
    const resolvedArchive = resolve(archive);
    const resolvedTarget = resolve(target);

    await mkdir(resolvedTarget, { recursive: true });

    // Use tar module from Node.js or shell command for extraction
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    try {
      // Attempt using tar command (available on Linux ARM64)
      await execAsync(`tar -xzf "${resolvedArchive}" -C "${resolvedTarget}"`);
    } catch (tarError) {
      // Fallback: try unzip for .zip files
      try {
        await execAsync(`unzip -o "${resolvedArchive}" -d "${resolvedTarget}"`);
      } catch {
        const message = tarError instanceof Error ? tarError.message : String(tarError);
        throw new Error(`[FileService] Extraction failed: ${message}`);
      }
    }
  }

  /**
   * Changes file permissions (Unix chmod).
   *
   * @param path - Absolute path to the file
   * @param mode - Octal permission string (e.g., '755') or numeric mode
   */
  async chmod(path: string, mode: string | number): Promise<void> {
    const resolvedPath = resolve(path);
    const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
    await fsChmod(resolvedPath, numericMode);
  }

  /**
   * Returns detailed file/directory statistics.
   *
   * @param path - Absolute path to the file or directory
   * @returns Object with size, permissions, type, created, modified, accessed timestamps
   */
  async stat(path: string): Promise<{
    size: number;
    permissions: string;
    type: 'file' | 'directory' | 'symlink' | 'other';
    created: string;
    modified: string;
    accessed: string;
    uid: number;
    gid: number;
  }> {
    const resolvedPath = resolve(path);
    const stats = await fsStat(resolvedPath);

    let type: 'file' | 'directory' | 'symlink' | 'other' = 'other';
    if (stats.isFile()) type = 'file';
    else if (stats.isDirectory()) type = 'directory';
    else if (stats.isSymbolicLink()) type = 'symlink';

    return {
      size: stats.size,
      permissions: this.modeToPermissions(stats.mode),
      type,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      uid: stats.uid,
      gid: stats.gid,
    };
  }
}
