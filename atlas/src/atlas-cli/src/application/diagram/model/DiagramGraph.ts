import type {
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';

/**
 * Represents one scope-filtered semantic graph ready for diagram artifact generation.
 */
export class DiagramGraph {
  /**
   * Creates a deterministic diagram graph with scope metadata and sorted elements.
   *
   * @param scope - Stable landscape or package scope identifier.
   * @param title - Human-readable diagram title.
   * @param nodes - Scope nodes sorted by stable identifier.
   * @param relationships - Scope relationships sorted by source, target, and type.
   */
  public constructor(
    public readonly scope: DiagramScope,
    public readonly title: string,
    public readonly nodes: readonly DeclarationNode[],
    public readonly relationships: readonly DeclarationRelationship[]
  ) {}
}

/**
 * Identifies a generated diagram scope supported by the initial artifact generator.
 */
export type DiagramScope =
  | 'landscape'
  | `project:${string}`
  | `module:${string}:${string}`
  | `package:${string}`
  | `group:${string}`
  | `folder:${string}:${string}`;
