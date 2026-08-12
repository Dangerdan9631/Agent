/**
 * Describes a language-neutral architectural model for one published artifact.
 */
export interface AtlasModuleModel {
  /** The independently versioned module-model schema. */
  readonly schemaVersion: 1;
  /** The generator version that produced this deterministic model. */
  readonly generatorVersion: string;
  /** The artifact whose declarations this model owns. */
  readonly module: AtlasArtifactIdentity;
  /** Presentation metadata that never changes architecture semantics. */
  readonly sourceLanguage: string;
  /** Hierarchical declarations owned exclusively by the artifact. */
  readonly elements: readonly AtlasElement[];
  /** Semantic relationships whose sources are owned elements. */
  readonly relationships: readonly AtlasRelationship[];
}

/**
 * Identifies one deployable artifact without imposing ecosystem-specific identity semantics.
 */
export interface AtlasArtifactIdentity {
  /** Opaque, stable artifact identity. */
  readonly id: string;
  /** Human-readable artifact name. */
  readonly displayName: string;
  /** Published artifact version. */
  readonly version: string;
  /** Optional target or build variant identity. */
  readonly variant?: string;
  /** Broad category of published artifact. */
  readonly category: string;
}

/**
 * Represents one declaration owned by an Atlas module model.
 */
export interface AtlasElement {
  /** Stable element identity derived from artifact and declaration identity. */
  readonly id: string;
  /** Display name of the declaration. */
  readonly name: string;
  /** Language-neutral architectural declaration category. */
  readonly kind: AtlasDeclarationKind;
  /** Normalized qualified declaration identity. */
  readonly qualifiedName: string;
  /** Optional overload signature used to distinguish otherwise equal declarations. */
  readonly signature?: string;
  /** Optional owned parent element identity. */
  readonly parentId?: string;
  /** Workspace-relative source path when source is available. */
  readonly sourcePath?: string;
  /** Shared semantic traits such as static or singleton. */
  readonly traits?: readonly string[];
  /** Normalized source visibility retained for selectors and diagram filters. */
  readonly visibility?: string;
}

/**
 * Identifies the common union of supported declaration constructs.
 */
export type AtlasDeclarationKind =
  | 'namespace'
  | 'source-unit'
  | 'class'
  | 'interface'
  | 'struct'
  | 'record'
  | 'enum'
  | 'annotation'
  | 'delegate'
  | 'type-alias'
  | 'function'
  | 'local-function'
  | 'constructor'
  | 'method'
  | 'property'
  | 'field'
  | 'constant'
  | 'event'
  | 'enum-member'
  | 'parameter'
  | 'local-variable'
  | 'type-parameter';

/**
 * Represents a relationship from an owned element to an owned or external target.
 */
export interface AtlasRelationship {
  /** Stable relationship identity. */
  readonly id: string;
  /** Owned source element identity. */
  readonly sourceElementId: string;
  /** Semantic relationship classification. */
  readonly kind: AtlasRelationshipKind;
  /** Owned or external relationship target. */
  readonly target: AtlasRelationshipTarget;
}

/**
 * Identifies shared semantic relationship categories.
 */
export type AtlasRelationshipKind =
  | 'imports'
  | 'exports'
  | 'references'
  | 'inherits'
  | 'implements'
  | 'calls'
  | 'instantiates'
  | 'reads'
  | 'writes'
  | 'overrides'
  | 'decorates'
  | 'contains';

/**
 * Identifies an owned target or an artifact dependency outside the current model.
 */
export interface AtlasRelationshipTarget {
  /** Artifact ID containing the target. Omit only for an owned target. */
  readonly moduleId?: string;
  /** Optional stable target element ID. */
  readonly elementId?: string;
  /** Display label used for an unresolved external placeholder. */
  readonly label?: string;
}
