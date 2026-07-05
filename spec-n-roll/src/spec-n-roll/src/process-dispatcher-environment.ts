import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DispatcherEnvironment } from '#dispatcher/dispatcher-environment.js';

/**
 * Provides process-backed environment values for the dispatcher.
 */
export class ProcessDispatcherEnvironment implements DispatcherEnvironment {
  /**
   * Returns the dispatcher process current working directory.
   *
   * @returns Current process working directory.
   */
  cwd(): string {
    return process.cwd();
  }

  /**
   * Returns the Node.js executable path used to run delegated entrypoints.
   *
   * @returns Current process Node.js executable path.
   */
  nodeExecutablePath(): string {
    return process.execPath;
  }

  /**
   * Returns the directory containing this dispatcher module.
   *
   * @returns Absolute dispatcher install directory.
   */
  dispatcherInstallDirectory(): string {
    return dirname(fileURLToPath(import.meta.url));
  }
}
