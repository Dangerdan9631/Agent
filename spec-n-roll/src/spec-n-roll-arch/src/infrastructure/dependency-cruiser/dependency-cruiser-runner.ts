import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Runs dependency-cruiser for package source trees.
 */
export class DependencyCruiserRunner {
  /**
   * Runs dependency-cruiser for a package source tree.
   *
   * @param workspaceRoot - Absolute path to the repository root.
   * @param workspacePackage - Package metadata for the package to inspect.
   * @returns A dependency-cruiser JSON report.
   */
  run(workspaceRoot: string, workspacePackage: WorkspacePackage): string {
    const dependencyCruiserConfig = join(
      workspaceRoot,
      'src',
      'spec-n-roll-arch',
      'dependency-cruiser.config.cjs',
    );
    const sourcePath = join(workspacePackage.root, 'src');

    return execFileSync(
      process.execPath,
      [
        join(
          workspaceRoot,
          'node_modules',
          'dependency-cruiser',
          'bin',
          'dependency-cruise.mjs',
        ),
        '--config',
        dependencyCruiserConfig,
        '--output-type',
        'json',
        sourcePath,
      ],
      { cwd: workspaceRoot, encoding: 'utf8' },
    );
  }
}
