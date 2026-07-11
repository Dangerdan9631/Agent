import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { RuntimePackageManifestPathResolver } from '#dispatcher/application/runtime/runtime-package-manifest-path-resolver.js';

/**
 * Resolves the installed runtime manifest through Node.js module resolution.
 */
export class NodeRuntimePackageManifestPathResolver implements RuntimePackageManifestPathResolver {
  /**
   * Resolves the runtime package manifest from a dispatcher install directory.
   *
   * @param dispatcherInstallDirectory - Directory containing the running dispatcher entry file.
   * @returns Absolute path to the installed runtime package manifest.
   */
  resolve(dispatcherInstallDirectory: string): string {
    return createRequire(join(dispatcherInstallDirectory, 'index.js')).resolve(
      'spec-n-roll-runtime/package.json',
    );
  }
}
