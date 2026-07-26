/**
 * Represents versioned persisted layout state for one generated diagram scope.
 */
export class LayoutDocument {
  /**
   * Creates a canonical layout document with sorted node positions and hidden relationships.
   *
   * @param schemaVersion - Persisted layout document schema version. Version one is currently supported.
   * @param positions - Positions for every live graph node sorted by stable node ID.
   * @param hiddenRelationshipIds - Stable IDs of intentionally hidden live relationships sorted lexicographically.
   */
  public constructor(
    public readonly schemaVersion: 1,
    public readonly positions: readonly LayoutPosition[],
    public readonly hiddenRelationshipIds: readonly string[]
  ) {}
}

/**
 * Represents one absolute model-space position retained for a live graph node.
 */
export class LayoutPosition {
  /**
   * Creates one persisted node position.
   *
   * @param nodeId - Stable graph node identifier.
   * @param parentId - Stable compound parent identifier, when the node belongs to a package group.
   * @param x - Finite absolute horizontal model coordinate.
   * @param y - Finite absolute vertical model coordinate.
   */
  public constructor(
    public readonly nodeId: string,
    public readonly parentId: string | undefined,
    public readonly x: number,
    public readonly y: number
  ) {}
}

/**
 * Configures deterministic node placement behavior.
 */
export class LayoutSettings {
  /**
   * Creates validated layout settings after command and configuration parsing.
   *
   * @param orientation - Primary placement direction.
   * @param rows - Maximum nodes in each generated row.
   * @param horizontalGap - Minimum horizontal space between item bounds.
   * @param verticalGap - Minimum vertical space between item bounds.
   * @param force - Determines whether valid saved positions may be replaced.
   */
  public constructor(
    public readonly orientation: LayoutOrientation,
    public readonly rows: number,
    public readonly horizontalGap: number,
    public readonly verticalGap: number,
    public readonly force: boolean
  ) {}
}

/**
 * Represents optional command-level layout changes applied over workspace configuration defaults.
 */
export class LayoutOverrides {
  /**
   * Creates optional parsed command-line layout overrides.
   *
   * @param orientation - Optional primary placement direction.
   * @param rows - Optional maximum generated nodes in each row.
   * @param horizontalGap - Optional minimum horizontal node gap.
   * @param verticalGap - Optional minimum vertical node gap.
   * @param force - Determines whether valid saved positions should be replaced.
   */
  public constructor(
    public readonly orientation: LayoutOrientation | undefined,
    public readonly rows: number | undefined,
    public readonly horizontalGap: number | undefined,
    public readonly verticalGap: number | undefined,
    public readonly force: boolean
  ) {}
}

/**
 * Identifies the primary visual axis used by deterministic flow placement.
 */
export type LayoutOrientation = 'horizontal' | 'vertical';
