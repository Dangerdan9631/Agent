import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';

/**
 * Captures the validated workspace state shared by Atlas command workflows.
 */
export class WorkspaceSnapshot {
  /**
   * Creates a fully loaded workspace with policy, resolved paths, and selected packages.
   *
   * @param paths - Canonical invocation paths including the artifact root.
   * @param configuration - Validated user-owned Atlas configuration.
   * @param packages - Explicitly classified packages selected for analysis.
   */
  public constructor(
    public readonly paths: ResolvedWorkspacePaths,
    public readonly configuration: AtlasConfiguration,
    public readonly packages: readonly WorkspacePackage[]
  ) {}
}
