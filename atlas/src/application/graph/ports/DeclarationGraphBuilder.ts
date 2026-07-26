import type { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Builds a declaration-level semantic graph for every selected TypeScript workspace package.
 */
export interface DeclarationGraphBuilder {
  /**
   * Traverses TypeScript source and resolves declaration relationships for one workspace.
   *
   * @param workspace - Loaded workspace package selection and source roots.
   * @returns Stable declaration graph with normalized local and external nodes.
   */
  build(workspace: WorkspaceSnapshot): Promise<DeclarationGraph>;
}
