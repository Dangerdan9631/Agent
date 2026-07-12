/**
 * Describes the visual category assigned to a source declaration node.
 */
export type ArchitectureTypeNodeKind = 'class' | 'interface' | 'other';

/**
 * Describes a declaration or a file-level module node in the architecture graph.
 */
export interface ArchitectureTypeNode {
  /** Stable identifier for this node. */
  id: string;
  /** Human-readable declaration or module name. */
  label: string;
  /** Visual category used by architecture renderers. */
  nodeKind: ArchitectureTypeNodeKind;
  /** Workspace package that owns the declaration. */
  packageName: string;
  /** Workspace-relative TypeScript source file path. */
  sourceFile: string;
  /** True when this node groups top-level functions and values from one file. */
  moduleNode: boolean;
}

/**
 * Describes the semantic relationship between two architecture nodes.
 */
export type ArchitectureTypeRelationshipKind = 'reference' | 'inheritance';

/**
 * Describes one directed declaration relationship.
 */
export interface ArchitectureTypeRelationship {
  /** Node that contains the reference or heritage clause. */
  sourceId: string;
  /** Target node id or stable `external:` dependency id. */
  targetId: string;
  /** Semantic relationship category used to style the edge. */
  relationshipType: ArchitectureTypeRelationshipKind;
}

/**
 * Contains the declaration nodes and relationships discovered across workspace packages.
 */
export interface ArchitectureTypeGraph {
  /** Declaration and module nodes discovered in workspace source files. */
  nodes: ArchitectureTypeNode[];
  /** Directed relationships between declaration nodes and external dependencies. */
  relationships: ArchitectureTypeRelationship[];
}
