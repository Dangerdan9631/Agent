import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';

/**
 * Discovers packages selected by explicit Atlas workspace policy.
 */
export interface WorkspacePackageDiscoverer {
  /**
   * Discovers and classifies packages under one resolved workspace root.
   *
   * @param workspaceRootPath - Absolute workspace root path. Must name an existing directory.
   * @param configuration - Validated configuration that selects packages and source roots.
   * @returns Packages sorted by normalized workspace-relative root path.
   */
  discover(
    workspaceRootPath: string,
    configuration: AtlasConfiguration
  ): Promise<readonly WorkspacePackage[]>;
}
