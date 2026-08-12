/**
 * Groups stable declaration nodes and directed semantic relationships for one workspace.
 */
export class DeclarationGraph {
  /**
   * Creates a deterministic workspace declaration graph.
   *
   * @param nodes - Nodes sorted by stable identifier.
   * @param relationships - Relationships sorted by source, target, and semantic type.
   */
  public constructor(
    public readonly nodes: readonly DeclarationNode[],
    public readonly relationships: readonly DeclarationRelationship[]
  ) {}
}

/**
 * Represents a named top-level declaration, synthetic file module, or unresolved external dependency.
 */
export class DeclarationNode {
  /**
   * Creates a stable semantic graph node.
   *
   * @param id - Stable identifier derived from a normalized path and semantic identity.
   * @param label - Human-readable declaration or external dependency label.
   * @param kind - Semantic declaration category.
   * @param packageName - Owning workspace package name, when the node is local.
   * @param sourcePath - Workspace-relative declaration source path, when the node is local.
   * @param moduleNode - Indicates whether the node aggregates top-level functions and values for a file.
   * @param sourceLanguage - Optional presentation-only source ecosystem metadata for viewer strategies.
   * @param semanticKind - Exact normalized element kind before renderer compatibility mapping.
   * @param visibility - Normalized source visibility used by diagram filters.
   * @param traits - Sorted source and normalized traits used by diagram filters.
   */
  public constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly kind: DeclarationNodeKind,
    public readonly packageName: string | undefined,
    public readonly sourcePath: string | undefined,
    public readonly moduleNode: boolean,
    public readonly sourceLanguage: string | undefined = undefined,
    public readonly semanticKind: string = kind,
    public readonly visibility: string | undefined = undefined,
    public readonly traits: readonly string[] = []
  ) {}
}

/**
 * Identifies the rendered semantic category of a declaration graph node.
 */
export type DeclarationNodeKind =
  | 'class'
  | 'interface'
  | 'type-alias'
  | 'enum'
  | 'function'
  | 'field'
  | 'constant'
  | 'module'
  | 'external';

/**
 * Represents one directed semantic reference or inheritance relationship.
 */
export class DeclarationRelationship {
  /**
   * Creates a stable directed graph relationship.
   *
   * @param id - Stable identifier derived from endpoints and semantic relationship type.
   * @param sourceId - Stable identifier of the referring declaration node.
   * @param targetId - Stable identifier of the referenced declaration or external node.
   * @param type - Semantic relationship category.
   * @param semanticKind - Exact normalized relationship kind before renderer compatibility mapping.
   */
  public constructor(
    public readonly id: string,
    public readonly sourceId: string,
    public readonly targetId: string,
    public readonly type: DeclarationRelationshipType,
    public readonly semanticKind: string = type
  ) {}
}

/**
 * Identifies whether a semantic relationship is ordinary use or TypeScript inheritance/implementation.
 */
export type DeclarationRelationshipType = 'reference' | 'inheritance';
