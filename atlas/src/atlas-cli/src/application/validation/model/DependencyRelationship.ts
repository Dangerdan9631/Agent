/**
 * Represents one normalized directed dependency reported by an analysis adapter.
 */
export class DependencyRelationship {
  /**
   * Creates one dependency relationship with portable source and target identities.
   *
   * @param sourcePath - Slash-normalized workspace-relative importing source file path.
   * @param targetPath - Slash-normalized workspace-relative resolved target path, when safely resolved.
   * @param moduleSpecifier - Import text as it appeared in source code.
   * @param circular - Indicates whether following this relationship returns to its source.
   * @param cyclePath - Ordered workspace-relative cycle path when the relationship is circular.
   * @param sourceModuleId - Opaque owning module identity when supplied by a federated model.
   * @param targetModuleId - Opaque target module identity when resolved from a federated model.
   * @param relationshipKind - Exact normalized relationship kind from the generated model.
   * @param sourceElementId - Module-local source element identity.
   * @param targetElementId - Module-local or cross-module target element identity when exact.
   * @param externalTargetId - Stable unresolved external identity when applicable.
   */
  public constructor(
    public readonly sourcePath: string,
    public readonly targetPath: string | undefined,
    public readonly moduleSpecifier: string,
    public readonly circular: boolean,
    public readonly cyclePath: readonly string[],
    public readonly sourceModuleId: string | undefined = undefined,
    public readonly targetModuleId: string | undefined = undefined,
    public readonly relationshipKind: string | undefined = undefined,
    public readonly sourceElementId: string | undefined = undefined,
    public readonly targetElementId: string | undefined = undefined,
    public readonly externalTargetId: string | undefined = undefined
  ) {}
}
