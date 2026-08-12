import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import type { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { AtlasModuleConfiguration } from '#application/configuration/model/AtlasConfiguration.js';

/**
 * Captures the validated workspace state shared by Atlas command workflows.
 */
export class WorkspaceSnapshot {
  /**
   * Creates a fully loaded workspace with policy, resolved paths, and selected packages.
   *
   * @param paths - Canonical invocation paths including the artifact root.
   * @param configuration - Validated user-owned Atlas configuration.
   * @param packages - Compatibility module identities derived only from successfully loaded models.
   * @param modelWorkspace - Language-neutral facts loaded from configured generated models.
   * @param missingModelPaths - Configured generated models absent from the loaded subset.
   * @param moduleConfigurationsById - Complete module policy keyed by derived loaded model ID.
   */
  public constructor(
    public readonly paths: ResolvedWorkspacePaths,
    public readonly configuration: AtlasConfiguration,
    public readonly packages: readonly WorkspacePackage[],
    public readonly modelWorkspace?: ResolvedAtlasWorkspace,
    public readonly missingModelPaths: readonly string[] = [],
    public readonly moduleConfigurationsById: ReadonlyMap<
      string,
      AtlasModuleConfiguration
    > = new Map()
  ) {}
}
