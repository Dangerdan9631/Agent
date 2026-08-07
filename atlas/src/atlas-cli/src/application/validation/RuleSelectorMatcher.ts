import type { AtlasRuleSelector } from '#application/configuration/model/AtlasConfiguration.js';
import type { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { minimatch } from 'minimatch';

/**
 * Matches workspace-relative source paths against package, class, and named-layer rule selectors.
 */
export class RuleSelectorMatcher {
  /**
   * Creates a selector matcher with package ownership resolution.
   *
   * @param ownershipResolver - Resolves source paths to explicitly discovered packages.
   */
  public constructor(private readonly ownershipResolver: PackageOwnershipResolver) {}

  /**
   * Determines whether any selector branch matches a workspace-relative source path.
   *
   * @param selector - Declared package/class/layer selector.
   * @param sourcePath - Slash-normalized workspace-relative source path.
   * @param workspace - Loaded workspace policy and packages.
   * @returns True when the path matches at least one selector branch.
   */
  public matches(
    selector: AtlasRuleSelector,
    sourcePath: string,
    workspace: WorkspaceSnapshot
  ): boolean {
    const workspacePackage = this.ownershipResolver.resolve(sourcePath, workspace.packages);
    const packageNameMatches =
      workspacePackage !== undefined &&
      [...(selector.packageNames ?? []), ...(selector.moduleIds ?? [])].includes(
        workspacePackage.name
      );
    const packageClassMatches =
      workspacePackage !== undefined &&
      (selector.packageClasses ?? []).some((packageClass) =>
        workspacePackage.classes.includes(packageClass)
      );
    const layerMatches = (selector.layers ?? []).some((layerName) =>
      this.matchesLayer(layerName, sourcePath, workspacePackage?.name, workspace)
    );

    return packageNameMatches || packageClassMatches || layerMatches;
  }

  /**
   * Determines whether one named layer contains a source path and its owning package.
   *
   * @param layerName - Configured layer name requested by a rule selector.
   * @param sourcePath - Slash-normalized workspace-relative source path.
   * @param packageName - Owning package name, when the path belongs to a configured package.
   * @param workspace - Loaded workspace configuration.
   * @returns True when the configured layer includes the path.
   */
  private matchesLayer(
    layerName: string,
    sourcePath: string,
    packageName: string | undefined,
    workspace: WorkspaceSnapshot
  ): boolean {
    const layer = (workspace.configuration.layers ?? []).find(
      (candidateLayer) => candidateLayer.name === layerName
    );

    if (layer === undefined) {
      return false;
    }

    if (
      layer.packageNames !== undefined &&
      (packageName === undefined || !layer.packageNames.includes(packageName))
    ) {
      return false;
    }

    return layer.sourceGlobs.some((sourceGlob) =>
      minimatch(sourcePath, sourceGlob.replaceAll('\\', '/'), { dot: true })
    );
  }
}
