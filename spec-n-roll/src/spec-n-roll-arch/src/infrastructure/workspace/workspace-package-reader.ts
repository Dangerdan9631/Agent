import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Reads workspace package manifests into architecture metadata.
 */
export class WorkspacePackageReader {
  /**
   * Reads a workspace package manifest and normalizes dependency metadata.
   *
   * @param packageRoot - Absolute path to a workspace package root.
   * @returns Workspace package metadata used by architecture generation.
   */
  read(packageRoot: string): WorkspacePackage {
    const packageJson = JSON.parse(
      readFileSync(join(packageRoot, 'package.json'), 'utf8'),
    ) as {
      name: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    return {
      name: packageJson.name,
      root: packageRoot,
      dependencies: {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      },
    };
  }
}
