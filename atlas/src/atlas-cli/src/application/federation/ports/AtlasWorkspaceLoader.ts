import type { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';

/**
 * Loads and resolves the module models selected by one workspace manifest.
 */
export interface AtlasWorkspaceLoader {
  /**
   * Loads a manifest and independently validates every selected module model.
   *
   * @param manifestPath - Absolute or process-relative workspace manifest path.
   * @returns Resolved federated workspace with unresolved dependencies retained as external targets.
   */
  load(manifestPath: string): Promise<ResolvedAtlasWorkspace>;
}
