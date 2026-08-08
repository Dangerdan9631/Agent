import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import type { ManifestWorkspacePackageResolver as ManifestWorkspacePackageResolverPort } from '#application/workspace/ports/ManifestWorkspacePackageResolver.js';
import type { PackagePolicySelector } from '#infrastructure/workspace/PackagePolicySelector.js';

/**
 * Classifies manifest modules as logical packages without inspecting their generating platform.
 */
export class ManifestWorkspacePackageResolver implements ManifestWorkspacePackageResolverPort {
  /**
   * Creates manifest package resolution from portable model loading and explicit policy selection.
   *
   * @param manifestLoader - Loads the manifest-selected language-neutral models.
   * @param policySelector - Selects exactly one configured policy for each module identity.
   */
  public constructor(
    private readonly manifestLoader: AtlasWorkspaceLoader,
    private readonly policySelector: PackagePolicySelector
  ) {}

  /**
   * Resolves each opaque module ID against name-based discovery policy.
   *
   * @param manifestPath - Atlas manifest selecting the portable module models.
   * @param workspaceRootPath - Absolute command workspace root retained for transient paths.
   * @param configuration - Validated workspace classification policy.
   * @returns Logical packages whose source paths are interpreted relative to their owning modules.
   */
  public async resolve(
    manifestPath: string,
    workspaceRootPath: string,
    configuration: AtlasConfiguration
  ): Promise<readonly WorkspacePackage[]> {
    const workspace = await this.manifestLoader.load(manifestPath);
    return [...workspace.modules.values()]
      .sort((left, right) => left.module.id.localeCompare(right.module.id))
      .map((model) => {
        const policy = this.policySelector.select(configuration.discovery, model.module.id, '.');
        return new WorkspacePackage(
          model.module.id,
          workspaceRootPath,
          '.',
          [],
          policy.classification,
          [...(policy.classes ?? [])].sort((left, right) => left.localeCompare(right)),
          undefined
        );
      });
  }
}
