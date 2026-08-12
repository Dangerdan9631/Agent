import type {
  AtlasElementSelector,
  AtlasLayerDefinition,
  AtlasModuleSelector,
  AtlasRuleSelector
} from '#application/configuration/model/AtlasConfiguration.js';
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
   * @param moduleId - Optional opaque module identity for module-local federated paths.
   * @param elementId - Optional module-local element identity used by element selectors.
   * @returns True when the path matches at least one selector branch.
   */
  public matches(
    selector: AtlasRuleSelector | AtlasModuleSelector | AtlasElementSelector,
    sourcePath: string,
    workspace: WorkspaceSnapshot,
    moduleId: string | undefined = undefined,
    elementId: string | undefined = undefined
  ): boolean {
    const workspacePackage =
      moduleId === undefined
        ? this.ownershipResolver.resolve(sourcePath, workspace.packages)
        : workspace.packages.find((candidate) => candidate.name === moduleId);
    const legacySelector = selector as AtlasRuleSelector;
    const moduleSelector = selector as AtlasModuleSelector;
    const elementSelector = selector as AtlasElementSelector;
    const element =
      moduleId === undefined || elementId === undefined
        ? undefined
        : workspace.modelWorkspace?.modules
            .get(moduleId)
            ?.elements.find((candidate) => candidate.id === elementId);
    const packageNameMatches =
      workspacePackage !== undefined &&
      (legacySelector.packageNames ?? []).includes(workspacePackage.name);
    const moduleIdMatches =
      moduleSelector.moduleIds === undefined ||
      (workspacePackage !== undefined &&
        moduleSelector.moduleIds.some((pattern) => this.matchesId(workspacePackage.name, pattern)));
    const moduleTagMatches =
      moduleSelector.moduleTags === undefined ||
      (workspacePackage !== undefined &&
        moduleSelector.moduleTags.some((tag) => workspacePackage.classes.includes(tag)));
    const sourcePathMatches =
      elementSelector.sourcePaths === undefined ||
      elementSelector.sourcePaths.some((pattern) =>
        minimatch(sourcePath, pattern.replaceAll('\\', '/'), { dot: true })
      );
    const elementKindMatches =
      elementSelector.elementKinds === undefined ||
      (element !== undefined && elementSelector.elementKinds.includes(element.kind));
    const visibilityMatches =
      elementSelector.visibilities === undefined ||
      (element?.visibility !== undefined &&
        elementSelector.visibilities.some((visibility) => visibility === element.visibility));
    const traitMatches =
      elementSelector.traits === undefined ||
      (element !== undefined &&
        elementSelector.traits.some((trait) => element.traits?.includes(trait) === true));
    const packageClassMatches =
      workspacePackage !== undefined &&
      (legacySelector.packageClasses ?? []).some((packageClass) =>
        workspacePackage.classes.includes(packageClass)
      );
    const layerMatches = (legacySelector.layers ?? []).some((layerName) =>
      this.matchesLayer(layerName, sourcePath, workspacePackage?.name, workspace)
    );

    const usesVersionTwoSelector =
      moduleSelector.moduleIds !== undefined ||
      moduleSelector.moduleTags !== undefined ||
      elementSelector.sourcePaths !== undefined ||
      elementSelector.elementKinds !== undefined ||
      elementSelector.visibilities !== undefined ||
      elementSelector.traits !== undefined;
    if (usesVersionTwoSelector) {
      return (
        moduleIdMatches &&
        moduleTagMatches &&
        sourcePathMatches &&
        elementKindMatches &&
        visibilityMatches &&
        traitMatches
      );
    }
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
    const layers =
      (
        workspace.configuration as unknown as {
          readonly layers?: readonly AtlasLayerDefinition[];
        }
      ).layers ?? [];
    const layer = layers.find((candidateLayer) => candidateLayer.name === layerName);

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

  /** Matches the complete opaque ID grammar where star also spans slash characters. */
  private matchesId(value: string, pattern: string): boolean {
    const expression = pattern
      .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('\\*', '.*')
      .replaceAll('\\?', '.');
    return new RegExp(`^${expression}$`, 'u').test(value);
  }
}
