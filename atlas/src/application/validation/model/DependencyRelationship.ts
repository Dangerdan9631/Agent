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
   */
  public constructor(
    public readonly sourcePath: string,
    public readonly targetPath: string | undefined,
    public readonly moduleSpecifier: string,
    public readonly circular: boolean,
    public readonly cyclePath: readonly string[]
  ) {}
}
