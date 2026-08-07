import type { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import type { LayoutDocument } from '#application/layout/model/LayoutDocument.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Persists deterministic diagram data, matrix, viewer shell, and navigation artifacts.
 */
export interface DiagramArtifactWriter {
  /**
   * Writes all diagram artifacts for a generated workspace graph set.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagrams - Scope-filtered diagram graphs sorted by stable scope identifier.
   * @returns A promise that resolves after artifacts and navigation have been atomically persisted.
   */
  write(workspace: WorkspaceSnapshot, diagrams: readonly DiagramGraph[]): Promise<void>;

  /**
   * Writes one requested scope while rebuilding shared navigation from all projected scopes.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagram - Only graph scope whose graph, matrix, viewer, and layout may be rewritten.
   * @param allDiagrams - Full projected scope set used solely for navigation metadata.
   * @returns A promise that resolves after scoped artifacts and shared navigation have been persisted.
   */
  writeScope(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph,
    allDiagrams: readonly DiagramGraph[]
  ): Promise<void>;

  /**
   * Persists layout state for one already projected diagram scope.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagram - Scope graph whose artifact layout is being updated.
   * @param layout - Complete canonical layout state for the live graph.
   * @returns A promise that resolves after the scope layout is atomically persisted.
   */
  writeLayout(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph,
    layout: LayoutDocument
  ): Promise<void>;

  /**
   * Reads compatible existing layout state for one generated diagram scope.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagram - Scope graph whose saved layout is requested.
   * @returns Compatible persisted layout, or undefined when no usable layout exists.
   */
  readLayout(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph
  ): Promise<LayoutDocument | undefined>;

  /**
   * Reads one existing generated graph artifact without rebuilding semantic source data.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param scope - Existing stable generated scope identifier.
   * @returns Reconstructed diagram graph, or undefined when the requested artifact is unavailable or malformed.
   */
  readDiagram(
    workspace: WorkspaceSnapshot,
    scope: DiagramGraph['scope']
  ): Promise<DiagramGraph | undefined>;
}
