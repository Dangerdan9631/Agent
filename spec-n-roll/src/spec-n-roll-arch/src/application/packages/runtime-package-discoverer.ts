import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RuntimePackagePolicy } from '#arch/application/packages/runtime-package-policy.js';
import { WorkspacePackageReader } from '#arch/infrastructure/workspace/workspace-package-reader.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Discovers workspace packages that participate in runtime architecture.
 */
export class RuntimePackageDiscoverer {
  /**
   * Creates a runtime package discoverer.
   *
   * @param reader - Manifest reader for workspace package directories.
   * @param policy - Inclusion policy for runtime architecture packages.
   */
  constructor(
    private readonly reader = new WorkspacePackageReader(),
    private readonly policy = new RuntimePackagePolicy(),
  ) {}

  /**
   * Reads package metadata for workspace packages that participate in runtime architecture.
   *
   * @param workspaceRoot - Absolute path to the repository root.
   * @returns Runtime workspace packages, excluding architecture and test support packages.
   */
  discover(workspaceRoot: string): WorkspacePackage[] {
    const sourceRoot = join(workspaceRoot, 'src');
    return readdirSync(sourceRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => this.reader.read(join(sourceRoot, entry.name)))
      .filter((workspacePackage) =>
        this.policy.includes(workspacePackage.name),
      );
  }
}
