import { existsSync, readFileSync } from 'node:fs';
import type { DispatcherFileSystem } from '#dispatcher/application/filesystem/dispatcher-file-system.js';

/**
 * Reads dispatcher filesystem paths through Node.js synchronous APIs.
 */
export class NodeDispatcherFileSystem implements DispatcherFileSystem {
  /**
   * Determines whether a filesystem path exists.
   *
   * @param path - Absolute or relative filesystem path to inspect.
   * @returns true when the path exists, otherwise false.
   */
  pathExists(path: string): boolean {
    return existsSync(path);
  }

  /**
   * Reads UTF-8 text and converts unreadable files into an absent value.
   *
   * @param path - Absolute or relative filesystem path to read.
   * @returns File text when readable, otherwise undefined.
   */
  readText(path: string): string | undefined {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return undefined;
    }
  }
}
