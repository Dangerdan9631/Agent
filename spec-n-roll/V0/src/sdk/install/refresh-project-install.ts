import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { resolveGlobalToolkitRoot } from '../../dispatcher/location.js';
import type { InstallSource } from './install-source.js';
import { installProjectBinaries } from './local-binaries.js';

/**
 * Options for refreshing the project-local CLI bundle from the global installation.
 */
export interface RefreshProjectInstallOptions {
  /**
   * Absolute path to the initialized project root receiving the refreshed bundle.
   */
  projectRoot: string;
  /**
   * Resolved global install source metadata that controls whether a linked build runs first.
   */
  globalInstallSource: InstallSource;
}

/**
 * Builds a linked global toolkit source tree when required, then copies the global bundle locally.
 *
 * @param options - Project root and global install source metadata for the refresh flow.
 * @returns Promise that resolves when the project-local bundle has been refreshed.
 */
export async function runRefreshProjectInstall(
  options: RefreshProjectInstallOptions,
): Promise<void> {
  if (
    options.globalInstallSource.kind === 'local' &&
    options.globalInstallSource.sourcePath != null
  ) {
    const result = spawnSync('npm', ['run', 'build'], {
      cwd: path.resolve(options.globalInstallSource.sourcePath),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    if (result.status !== 0) {
      throw new Error('Linked-source build failed.');
    }
  }

  await installProjectBinaries(options.projectRoot, resolveGlobalToolkitRoot());
}
