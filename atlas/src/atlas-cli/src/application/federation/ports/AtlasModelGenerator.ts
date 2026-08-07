import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Produces independently regenerable module models and one workspace manifest for a source ecosystem.
 */
export interface AtlasModelGenerator {
  /**
   * Generates all selected artifact models into a dedicated model directory.
   *
   * @param workspace - Loaded workspace containing source-ecosystem package selection.
   * @param modelDirectoryPath - Absolute output directory for model JSON documents.
   * @returns Absolute generated manifest path.
   */
  generate(workspace: WorkspaceSnapshot, modelDirectoryPath: string): Promise<string>;
}
