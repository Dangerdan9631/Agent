import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';

/**
 * Resolves manifest-selected module identities into explicitly classified workspace packages.
 */
export interface ManifestWorkspacePackageResolver {
  /**
   * Loads and classifies every selected module without discovering source-platform manifests.
   *
   * @param manifestPath - Absolute or invocation-relative Atlas workspace manifest path.
   * @param workspaceRootPath - Absolute workspace root used only for transient package paths.
   * @param configuration - Validated user-owned classification policy.
   * @returns Classified logical packages sorted by opaque module identity.
   */
  resolve(
    manifestPath: string,
    workspaceRootPath: string,
    configuration: AtlasConfiguration
  ): Promise<readonly WorkspacePackage[]>;
}
