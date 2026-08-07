import type {
  AtlasModuleModel,
  AtlasRelationship
} from '#application/federation/model/AtlasModuleModel.js';

/**
 * Holds a validated federated workspace and its identity-resolved relationships.
 */
export class ResolvedAtlasWorkspace {
  /**
   * Creates a federated workspace with immutable model and relationship indexes.
   *
   * @param modules - Validated models indexed by opaque artifact ID.
   * @param relationships - Resolved relationships from every loaded model.
   */
  public constructor(
    public readonly modules: ReadonlyMap<string, AtlasModuleModel>,
    public readonly relationships: readonly ResolvedAtlasRelationship[]
  ) {}
}

/**
 * Represents a relationship after external identities have been matched to loaded modules or elements.
 */
export class ResolvedAtlasRelationship {
  /**
   * Creates a resolved relationship retaining its owning artifact and original semantic data.
   *
   * @param sourceModuleId - Artifact that owns the relationship source.
   * @param relationship - Original validated model relationship.
   * @param targetModule - Loaded target artifact, when selected by the manifest.
   * @param targetElementId - Loaded owned target element, when supplied and found.
   */
  public constructor(
    public readonly sourceModuleId: string,
    public readonly relationship: AtlasRelationship,
    public readonly targetModule: AtlasModuleModel | undefined,
    public readonly targetElementId: string | undefined
  ) {}
}
