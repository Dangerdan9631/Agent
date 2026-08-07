import type { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import { LayoutDocument, LayoutPosition } from '#application/layout/model/LayoutDocument.js';
import type { LayoutSettings } from '#application/layout/model/LayoutDocument.js';
import type { DeclarationNode } from '#application/graph/model/DeclarationGraph.js';

/**
 * Computes deterministic flow layouts while retaining valid manually positioned nodes by default.
 */
export class DeterministicLayoutService {
  /**
   * Computes a canonical layout document for one diagram graph.
   *
   * @param diagram - Scope graph whose live nodes require positions.
   * @param savedLayout - Existing optional layout state to clean and retain.
   * @param settings - Validated deterministic placement settings.
   * @returns Canonical layout document for every live diagram node.
   */
  public layout(
    diagram: DiagramGraph,
    savedLayout: LayoutDocument | undefined,
    settings: LayoutSettings
  ): LayoutDocument {
    this.assertSettings(settings);
    const liveNodes = [...diagram.nodes].sort((left, right) => left.id.localeCompare(right.id));
    const retainedPositions = this.collectRetainedPositions(liveNodes, savedLayout, settings.force);
    const movableNodes = this.orderMovableNodes(liveNodes, retainedPositions, diagram);
    const generatedPositions =
      retainedPositions.size === 0
        ? this.placeHierarchicalNodes(liveNodes, diagram, settings)
        : this.placeMovableNodes(movableNodes, retainedPositions, liveNodes, settings);
    const allPositions = [...retainedPositions.values(), ...generatedPositions]
      .map((position) => this.roundPosition(position))
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    const hiddenRelationshipIds = (savedLayout?.hiddenRelationshipIds ?? [])
      .filter((relationshipId) =>
        diagram.relationships.some((relationship) => relationship.id === relationshipId)
      )
      .sort((left, right) => left.localeCompare(right));

    return new LayoutDocument(1, allPositions, hiddenRelationshipIds);
  }

  /**
   * Validates numeric layout settings before placement.
   *
   * @param settings - Settings supplied by configuration or command parsing.
   */
  private assertSettings(settings: LayoutSettings): void {
    if (!Number.isInteger(settings.rows) || settings.rows <= 0) {
      throw new Error('Atlas layout rows must be a positive integer.');
    }
    if (settings.horizontalGap < 0 || settings.verticalGap < 0) {
      throw new Error('Atlas layout gaps must be non-negative.');
    }
  }

  /**
   * Retains saved positions that remain live, finite, and associated with the current package parent.
   *
   * @param liveNodes - Live diagram nodes sorted by stable ID.
   * @param savedLayout - Optional existing layout document.
   * @param force - Determines whether all saved positions must be replaced.
   * @returns Map of fixed node positions keyed by stable node ID.
   */
  private collectRetainedPositions(
    liveNodes: readonly DeclarationNode[],
    savedLayout: LayoutDocument | undefined,
    force: boolean
  ): Map<string, LayoutPosition> {
    const retainedPositions = new Map<string, LayoutPosition>();
    if (savedLayout === undefined || force) {
      return retainedPositions;
    }

    for (const position of savedLayout.positions) {
      const node = liveNodes.find((candidate) => candidate.id === position.nodeId);
      if (
        node === undefined ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        position.parentId !== this.toParentId(node)
      ) {
        continue;
      }
      retainedPositions.set(position.nodeId, position);
    }
    return retainedPositions;
  }

  /**
   * Orders movable nodes by a deterministic dependency-aware topological order.
   *
   * @param liveNodes - All live diagram nodes.
   * @param retainedPositions - Valid fixed positions that must not be moved.
   * @param diagram - Diagram relationships used to order movable nodes.
   * @returns Movable nodes in canonical dependency order.
   */
  private orderMovableNodes(
    liveNodes: readonly DeclarationNode[],
    retainedPositions: ReadonlyMap<string, LayoutPosition>,
    diagram: DiagramGraph
  ): readonly DeclarationNode[] {
    const movableNodes = liveNodes.filter((node) => !retainedPositions.has(node.id));
    const movableNodeIds = new Set(movableNodes.map((node) => node.id));
    const outgoingIds = new Map(movableNodes.map((node) => [node.id, new Set<string>()]));

    for (const relationship of diagram.relationships) {
      if (
        !movableNodeIds.has(relationship.sourceId) ||
        !movableNodeIds.has(relationship.targetId)
      ) {
        continue;
      }
      const outgoing = outgoingIds.get(relationship.sourceId)!;
      if (!outgoing.has(relationship.targetId)) {
        outgoing.add(relationship.targetId);
      }
    }

    const components = new StrongComponentFinder(movableNodes, outgoingIds).find();
    const componentByNodeId = new Map<string, StrongComponent>();
    for (const component of components) {
      for (const node of component.nodes) {
        componentByNodeId.set(node.id, component);
      }
    }
    const outgoingComponents = new Map(
      components.map((component) => [component.id, new Set<string>()])
    );
    const incomingCounts = new Map(components.map((component) => [component.id, 0]));
    for (const [sourceId, targetIds] of outgoingIds) {
      const sourceComponent = componentByNodeId.get(sourceId);
      if (sourceComponent === undefined) {
        continue;
      }
      for (const targetId of targetIds) {
        const targetComponent = componentByNodeId.get(targetId);
        if (targetComponent === undefined || targetComponent.id === sourceComponent.id) {
          continue;
        }
        const targets = outgoingComponents.get(sourceComponent.id)!;
        if (!targets.has(targetComponent.id)) {
          targets.add(targetComponent.id);
          incomingCounts.set(targetComponent.id, (incomingCounts.get(targetComponent.id) ?? 0) + 1);
        }
      }
    }

    const remainingComponents = new Map(components.map((component) => [component.id, component]));
    const orderedNodes: DeclarationNode[] = [];
    while (remainingComponents.size > 0) {
      const nextComponent = [...remainingComponents.values()]
        .filter((component) => (incomingCounts.get(component.id) ?? 0) === 0)
        .sort((left, right) => this.compareNodes(left.keyNode, right.keyNode))[0];
      if (nextComponent === undefined) {
        throw new Error('Atlas could not topologically order condensed layout components.');
      }
      orderedNodes.push(...nextComponent.nodes);
      remainingComponents.delete(nextComponent.id);
      for (const targetId of outgoingComponents.get(nextComponent.id) ?? []) {
        incomingCounts.set(targetId, (incomingCounts.get(targetId) ?? 0) - 1);
      }
    }

    return orderedNodes;
  }

  /**
   * Places movable nodes into canonical flow slots while avoiding retained node bounds.
   *
   * @param movableNodes - Nodes ordered for generated placement.
   * @param retainedPositions - Fixed positions that generated nodes must not overlap.
   * @param settings - Validated flow settings.
   * @returns Generated positions for movable nodes.
   */
  private placeMovableNodes(
    movableNodes: readonly DeclarationNode[],
    retainedPositions: ReadonlyMap<string, LayoutPosition>,
    liveNodes: readonly DeclarationNode[],
    settings: LayoutSettings
  ): readonly LayoutPosition[] {
    const generatedPositions: LayoutPosition[] = [];
    let slotIndex = 0;

    for (const node of movableNodes) {
      let position: LayoutPosition;
      do {
        position = this.toSlotPosition(node, slotIndex, settings);
        slotIndex += 1;
      } while (this.overlapsFixedPosition(node, position, retainedPositions, liveNodes, settings));
      generatedPositions.push(position);
    }

    return this.translateGeneratedPositions(generatedPositions, retainedPositions);
  }

  /**
   * Recursively places package and source-directory compounds before placing their leaf declarations.
   *
   * @param liveNodes - Current declaration leaves requiring generated positions.
   * @param diagram - Relationships used for deterministic sibling ordering.
   * @param settings - Validated flow settings.
   * @returns Generated absolute positions for every declaration leaf.
   */
  private placeHierarchicalNodes(
    liveNodes: readonly DeclarationNode[],
    diagram: DiagramGraph,
    settings: LayoutSettings
  ): readonly LayoutPosition[] {
    const root = this.createHierarchy(liveNodes);
    this.layoutGroup(root, diagram, settings);
    const positions: LayoutPosition[] = [];
    this.collectGroupPositions(root, 0, 0, positions);
    const minimumX = Math.min(...positions.map((position) => position.x));
    const minimumY = Math.min(...positions.map((position) => position.y));
    return positions.map(
      (position) =>
        new LayoutPosition(
          position.nodeId,
          position.parentId,
          position.x - minimumX,
          position.y - minimumY
        )
    );
  }

  /**
   * Builds a stable package-directory containment tree from declaration ownership and source paths.
   *
   * @param nodes - Declaration leaves to insert into the hierarchy.
   * @returns Root compound group containing every local and external leaf.
   */
  private createHierarchy(nodes: readonly DeclarationNode[]): LayoutGroup {
    const root = new LayoutGroup('root', 'root', true);
    for (const node of nodes) {
      let group = root;
      for (const segment of this.toGroupSegments(node)) {
        group = group.getOrCreateChild(segment.id, segment.label);
      }
      group.addLeaf(node);
    }
    return root;
  }

  /**
   * Produces package and source-directory compound identities from one local declaration.
   *
   * @param node - Declaration whose ownership determines compound hierarchy.
   * @returns Ordered compound segments from package through deepest source directory.
   */
  private toGroupSegments(node: DeclarationNode): readonly LayoutGroupSegment[] {
    if (node.packageName === undefined) {
      return [];
    }
    const segments = [
      new LayoutGroupSegment(`package:${encodeURIComponent(node.packageName)}`, node.packageName)
    ];
    const sourceDirectory = node.sourcePath?.includes('/')
      ? node.sourcePath.slice(0, node.sourcePath.lastIndexOf('/'))
      : undefined;
    if (sourceDirectory === undefined || sourceDirectory.length === 0) {
      return segments;
    }
    const pathSegments = sourceDirectory.split('/');
    for (let index = 0; index < pathSegments.length; index += 1) {
      const segment = pathSegments[index];
      if (segment === undefined) {
        continue;
      }
      const path = pathSegments.slice(0, index + 1).join('/');
      segments.push(
        new LayoutGroupSegment(
          `directory:${encodeURIComponent(node.packageName)}:${encodeURIComponent(path)}`,
          segment
        )
      );
    }
    return segments;
  }

  /**
   * Recursively sizes and places one compound group's direct child groups and declarations.
   *
   * @param group - Compound group currently being arranged.
   * @param diagram - Relationships used for sibling dependency ordering.
   * @param settings - Validated layout settings.
   */
  private layoutGroup(group: LayoutGroup, diagram: DiagramGraph, settings: LayoutSettings): void {
    for (const child of group.children) {
      this.layoutGroup(child, diagram, settings);
    }
    const orderedLeaves = this.orderMovableNodes(group.leaves, new Map(), diagram);
    const items = [
      ...group.children
        .slice()
        .sort((left, right) => left.compare(right))
        .map((child) => new LayoutItem(child.id, child.width, child.height, child, undefined)),
      ...orderedLeaves.map(
        (leaf) =>
          new LayoutItem(leaf.id, this.nodeWidth(leaf), this.nodeHeight(leaf), undefined, leaf)
      )
    ];
    const padding = group.isRoot ? 0 : 40;
    const placement = new HierarchicalFlowPlacement(items, settings, padding).place();
    group.setBounds(placement.width, placement.height);
    for (const item of placement.items) {
      group.setItemPosition(item.item.id, item.x, item.y);
    }
  }

  /**
   * Converts recursively relative group coordinates into absolute persisted declaration positions.
   *
   * @param group - Group whose direct contents should be collected.
   * @param originX - Absolute top-left horizontal group bound.
   * @param originY - Absolute top-left vertical group bound.
   * @param positions - Mutable collected leaf positions.
   */
  private collectGroupPositions(
    group: LayoutGroup,
    originX: number,
    originY: number,
    positions: LayoutPosition[]
  ): void {
    for (const leaf of group.leaves) {
      const position = group.getItemPosition(leaf.id);
      positions.push(
        new LayoutPosition(
          leaf.id,
          this.toParentId(leaf),
          originX + position.x,
          originY + position.y
        )
      );
    }
    for (const child of group.children) {
      const position = group.getItemPosition(child.id);
      this.collectGroupPositions(
        child,
        originX + position.x - child.width / 2,
        originY + position.y - child.height / 2,
        positions
      );
    }
  }

  /**
   * Converts a canonical slot index into a node center coordinate.
   *
   * @param node - Node placed into the slot.
   * @param slotIndex - Zero-based canonical flow slot index.
   * @param settings - Validated placement settings.
   * @returns Generated absolute node position.
   */
  private toSlotPosition(
    node: DeclarationNode,
    slotIndex: number,
    settings: LayoutSettings
  ): LayoutPosition {
    const columnIndex = slotIndex % settings.rows;
    const rowIndex = Math.floor(slotIndex / settings.rows);
    const horizontalStride = 320 + settings.horizontalGap;
    const verticalStride = 80 + settings.verticalGap;
    const horizontalPosition = columnIndex * horizontalStride + this.nodeWidth(node) / 2;
    const verticalPosition = rowIndex * verticalStride + this.nodeHeight(node) / 2;
    const x = settings.orientation === 'horizontal' ? horizontalPosition : verticalPosition;
    const y = settings.orientation === 'horizontal' ? verticalPosition : horizontalPosition;

    return new LayoutPosition(node.id, this.toParentId(node), x, y);
  }

  /**
   * Tests a candidate generated node against fixed item bounds plus configured visual gaps.
   *
   * @param node - Candidate generated node.
   * @param position - Candidate generated position.
   * @param retainedPositions - Fixed node positions.
   * @param liveNodes - Nodes used to determine fixed node dimensions.
   * @param settings - Validated visual gap settings.
   * @returns True when candidate bounds overlap a retained position's expanded bounds.
   */
  private overlapsFixedPosition(
    node: DeclarationNode,
    position: LayoutPosition,
    retainedPositions: ReadonlyMap<string, LayoutPosition>,
    liveNodes: readonly DeclarationNode[],
    settings: LayoutSettings
  ): boolean {
    for (const fixedPosition of retainedPositions.values()) {
      const fixedNode = liveNodes.find((candidate) => candidate.id === fixedPosition.nodeId);
      if (fixedNode === undefined) {
        continue;
      }
      const horizontalDistance = Math.abs(position.x - fixedPosition.x);
      const verticalDistance = Math.abs(position.y - fixedPosition.y);
      const requiredHorizontalDistance =
        this.nodeWidth(node) / 2 + this.nodeWidth(fixedNode) / 2 + settings.horizontalGap;
      const requiredVerticalDistance =
        this.nodeHeight(node) / 2 + this.nodeHeight(fixedNode) / 2 + settings.verticalGap;
      if (
        horizontalDistance < requiredHorizontalDistance &&
        verticalDistance < requiredVerticalDistance
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Translates only generated coordinates so negative generated bounds begin at the model origin.
   *
   * @param generatedPositions - Positions created by this layout run.
   * @param retainedPositions - Fixed positions that must remain unchanged.
   * @returns Generated positions translated to non-negative model coordinates when needed.
   */
  private translateGeneratedPositions(
    generatedPositions: readonly LayoutPosition[],
    retainedPositions: ReadonlyMap<string, LayoutPosition>
  ): readonly LayoutPosition[] {
    if (generatedPositions.length === 0 || retainedPositions.size > 0) {
      return generatedPositions;
    }

    const minimumX = Math.min(...generatedPositions.map((position) => position.x));
    const minimumY = Math.min(...generatedPositions.map((position) => position.y));
    return generatedPositions.map(
      (position) =>
        new LayoutPosition(
          position.nodeId,
          position.parentId,
          position.x - minimumX,
          position.y - minimumY
        )
    );
  }

  /**
   * Derives deterministic fixed dimensions from a node category and label length.
   *
   * @param node - Diagram node whose rendered dimensions are required for layout.
   * @returns Deterministic node width in model units.
   */
  private nodeWidth(node: DeclarationNode): number {
    return Math.min(320, Math.max(140, 48 + Math.min(node.label.length, 34) * 8));
  }

  /**
   * Derives deterministic fixed height from a node category.
   *
   * @param node - Diagram node whose rendered dimensions are required for layout.
   * @returns Deterministic node height in model units.
   */
  private nodeHeight(node: DeclarationNode): number {
    return node.kind === 'module' || node.kind === 'external' ? 48 : 56;
  }

  /**
   * Computes the graph document's deepest package-directory compound parent ID for a node.
   *
   * @param node - Diagram declaration node.
   * @returns Stable directory or package parent identifier, or undefined for external nodes.
   */
  private toParentId(node: DeclarationNode): string | undefined {
    if (node.packageName === undefined) {
      return undefined;
    }
    if (node.sourcePath === undefined || !node.sourcePath.includes('/')) {
      return `package:${encodeURIComponent(node.packageName)}`;
    }
    const directoryPath = node.sourcePath.slice(0, node.sourcePath.lastIndexOf('/'));
    return directoryPath.length === 0
      ? `package:${encodeURIComponent(node.packageName)}`
      : `directory:${encodeURIComponent(node.packageName)}:${encodeURIComponent(directoryPath)}`;
  }

  /**
   * Orders nodes by normalized label then stable identifier.
   *
   * @param left - First node to compare.
   * @param right - Second node to compare.
   * @returns Negative, zero, or positive locale comparison result.
   */
  private compareNodes(left: DeclarationNode, right: DeclarationNode): number {
    const labelOrder = left.label.localeCompare(right.label);
    return labelOrder === 0 ? left.id.localeCompare(right.id) : labelOrder;
  }

  /**
   * Rounds a position to the documented three-decimal persisted precision.
   *
   * @param position - Position before persistence rounding.
   * @returns Rounded canonical position.
   */
  private roundPosition(position: LayoutPosition): LayoutPosition {
    return new LayoutPosition(
      position.nodeId,
      position.parentId,
      this.roundCoordinate(position.x),
      this.roundCoordinate(position.y)
    );
  }

  /**
   * Rounds one finite coordinate to three decimal places.
   *
   * @param coordinate - Finite model coordinate.
   * @returns Coordinate rounded to fixed persisted precision.
   */
  private roundCoordinate(coordinate: number): number {
    return Math.round(coordinate * 1000) / 1000;
  }
}

/**
 * Represents one compound group used during recursive generated layout placement.
 */
class LayoutGroup {
  /**
   * Holds child compounds in deterministic insertion-independent form.
   */
  readonly #childrenById = new Map<string, LayoutGroup>();

  /**
   * Holds direct declaration leaves for this group.
   */
  readonly #leaves: DeclarationNode[] = [];

  /**
   * Holds direct item center coordinates relative to this group's top-left bound.
   */
  readonly #positions = new Map<string, LayoutPoint>();

  /**
   * Holds completed width including recursive descendants and padding.
   */
  #width = 0;

  /**
   * Holds completed height including recursive descendants and padding.
   */
  #height = 0;

  /**
   * Creates one stable compound group.
   *
   * @param id - Stable compound identity.
   * @param label - Display label used for canonical sibling ordering.
   * @param isRoot - Determines whether the group omits compound padding.
   */
  public constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly isRoot: boolean
  ) {}

  /**
   * Returns direct child groups sorted by canonical group identity.
   */
  public get children(): readonly LayoutGroup[] {
    return [...this.#childrenById.values()];
  }

  /**
   * Returns direct declaration leaves in insertion-neutral collection form.
   */
  public get leaves(): readonly DeclarationNode[] {
    return this.#leaves;
  }

  /**
   * Returns completed rendered group width.
   */
  public get width(): number {
    return this.#width;
  }

  /**
   * Returns completed rendered group height.
   */
  public get height(): number {
    return this.#height;
  }

  /**
   * Creates or retrieves one direct child group.
   */
  public getOrCreateChild(id: string, label: string): LayoutGroup {
    const existing = this.#childrenById.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const child = new LayoutGroup(id, label, false);
    this.#childrenById.set(id, child);
    return child;
  }

  /**
   * Adds one declaration leaf to this compound group.
   */
  public addLeaf(leaf: DeclarationNode): void {
    this.#leaves.push(leaf);
  }

  /**
   * Stores completed group bounds.
   */
  public setBounds(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
  }

  /**
   * Stores one direct item center position relative to this group.
   */
  public setItemPosition(id: string, x: number, y: number): void {
    this.#positions.set(id, new LayoutPoint(x, y));
  }

  /**
   * Reads one already placed direct item position.
   */
  public getItemPosition(id: string): LayoutPoint {
    const position = this.#positions.get(id);
    if (position === undefined) {
      throw new Error(`Atlas did not place layout item '${id}'.`);
    }
    return position;
  }

  /**
   * Compares groups by display label then stable identity.
   */
  public compare(other: LayoutGroup): number {
    const labelOrder = this.label.localeCompare(other.label);
    return labelOrder === 0 ? this.id.localeCompare(other.id) : labelOrder;
  }
}

/**
 * Identifies one compound segment while constructing a layout group hierarchy.
 */
class LayoutGroupSegment {
  /**
   * Creates a stable group identity and label pair.
   */
  public constructor(
    public readonly id: string,
    public readonly label: string
  ) {}
}

/**
 * Represents one direct group or leaf item prepared for flow placement.
 */
class LayoutItem {
  /**
   * Creates a rectangular direct item.
   */
  public constructor(
    public readonly id: string,
    public readonly width: number,
    public readonly height: number,
    public readonly group: LayoutGroup | undefined,
    public readonly leaf: DeclarationNode | undefined
  ) {}
}

/**
 * Holds one calculated item center position from hierarchical flow placement.
 */
class LayoutPoint {
  /**
   * Creates a finite relative item center coordinate.
   */
  public constructor(
    public readonly x: number,
    public readonly y: number
  ) {}
}

/**
 * Holds one placed direct item and its group-relative center coordinate.
 */
class PlacedLayoutItem {
  /**
   * Creates one completed direct item placement.
   */
  public constructor(
    public readonly item: LayoutItem,
    public readonly x: number,
    public readonly y: number
  ) {}
}

/**
 * Arranges rectangular direct items in deterministic row-major slots with variable dimensions.
 */
class HierarchicalFlowPlacement {
  /**
   * Creates a flow placer for a single compound group's direct items.
   */
  public constructor(
    private readonly itemsToPlace: readonly LayoutItem[],
    private readonly settings: LayoutSettings,
    private readonly padding: number
  ) {}

  /**
   * Calculates flow coordinates and the completed compound bounds.
   */
  public place(): HierarchicalPlacementResult {
    if (this.itemsToPlace.length === 0) {
      return new HierarchicalPlacementResult([], this.padding * 2, this.padding * 2);
    }
    const columnCount = Math.min(this.settings.rows, this.itemsToPlace.length);
    const rowCount = Math.ceil(this.itemsToPlace.length / columnCount);
    const columnWidths = Array.from({ length: columnCount }, () => 0);
    const rowHeights = Array.from({ length: rowCount }, () => 0);
    for (const [index, item] of this.itemsToPlace.entries()) {
      const column = index % columnCount;
      const row = Math.floor(index / columnCount);
      columnWidths[column] = Math.max(columnWidths[column] ?? 0, item.width);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, item.height);
    }
    const positions: PlacedLayoutItem[] = [];
    for (const [index, item] of this.itemsToPlace.entries()) {
      const column = index % columnCount;
      const row = Math.floor(index / columnCount);
      const horizontal =
        this.padding +
        this.sum(columnWidths, column) +
        column * this.settings.horizontalGap +
        item.width / 2;
      const vertical =
        this.padding +
        this.sum(rowHeights, row) +
        row * this.settings.verticalGap +
        item.height / 2;
      positions.push(
        this.settings.orientation === 'horizontal'
          ? new PlacedLayoutItem(item, horizontal, vertical)
          : new PlacedLayoutItem(item, vertical, horizontal)
      );
    }
    const horizontalWidth =
      this.padding * 2 +
      columnWidths.reduce((sum, width) => sum + width, 0) +
      (columnCount - 1) * this.settings.horizontalGap;
    const verticalHeight =
      this.padding * 2 +
      rowHeights.reduce((sum, height) => sum + height, 0) +
      (rowCount - 1) * this.settings.verticalGap;
    return this.settings.orientation === 'horizontal'
      ? new HierarchicalPlacementResult(positions, horizontalWidth, verticalHeight)
      : new HierarchicalPlacementResult(positions, verticalHeight, horizontalWidth);
  }

  /**
   * Sums dimensions preceding one index.
   */
  private sum(values: readonly number[], exclusiveEnd: number): number {
    return values.slice(0, exclusiveEnd).reduce((sum, value) => sum + value, 0);
  }
}

/**
 * Represents completed item placements and containing compound bounds.
 */
class HierarchicalPlacementResult {
  /**
   * Creates a completed placement result.
   */
  public constructor(
    public readonly items: readonly PlacedLayoutItem[],
    public readonly width: number,
    public readonly height: number
  ) {}
}

/**
 * Finds canonical strongly connected components for a directed declaration-node graph.
 */
class StrongComponentFinder {
  /**
   * Holds the next Tarjan depth-first index.
   */
  #nextIndex = 0;

  /**
   * Holds discovery indices by stable node ID.
   */
  readonly #indices = new Map<string, number>();

  /**
   * Holds low-link values by stable node ID.
   */
  readonly #lowLinks = new Map<string, number>();

  /**
   * Holds node IDs currently on the Tarjan traversal stack.
   */
  readonly #stack: string[] = [];

  /**
   * Holds IDs currently present on the Tarjan traversal stack.
   */
  readonly #stackIds = new Set<string>();

  /**
   * Holds completed strongly connected components.
   */
  readonly #components: StrongComponent[] = [];

  /**
   * Holds nodes keyed by stable ID.
   */
  readonly #nodesById: ReadonlyMap<string, DeclarationNode>;

  /**
   * Holds a canonical node-order index for stable traversal and component membership ordering.
   */
  readonly #nodeOrder = new Map<string, number>();

  /**
   * Creates Tarjan traversal state for one finite directed layout graph.
   *
   * @param nodes - Movable declaration nodes to partition.
   * @param outgoingIds - Directed adjacency keyed by source stable node ID.
   */
  public constructor(
    private readonly nodes: readonly DeclarationNode[],
    private readonly outgoingIds: ReadonlyMap<string, ReadonlySet<string>>
  ) {
    this.#nodesById = new Map(nodes.map((node) => [node.id, node]));
    [...nodes]
      .sort((left, right) => this.compareNodes(left, right))
      .forEach((node, index) => this.#nodeOrder.set(node.id, index));
  }

  /**
   * Partitions all nodes into canonical strongly connected components.
   *
   * @returns Components with members ordered by canonical label then stable ID.
   */
  public find(): readonly StrongComponent[] {
    for (const node of [...this.nodes].sort((left, right) => this.compareNodes(left, right))) {
      if (!this.#indices.has(node.id)) {
        this.visit(node.id);
      }
    }
    return this.#components;
  }

  /**
   * Performs one Tarjan depth-first traversal step.
   *
   * @param nodeId - Stable ID of the node being visited.
   */
  private visit(nodeId: string): void {
    const discoveryIndex = this.#nextIndex;
    this.#nextIndex += 1;
    this.#indices.set(nodeId, discoveryIndex);
    this.#lowLinks.set(nodeId, discoveryIndex);
    this.#stack.push(nodeId);
    this.#stackIds.add(nodeId);

    for (const targetId of this.sortedTargets(nodeId)) {
      if (!this.#indices.has(targetId)) {
        this.visit(targetId);
        this.#lowLinks.set(
          nodeId,
          Math.min(this.#lowLinks.get(nodeId)!, this.#lowLinks.get(targetId)!)
        );
      } else if (this.#stackIds.has(targetId)) {
        this.#lowLinks.set(
          nodeId,
          Math.min(this.#lowLinks.get(nodeId)!, this.#indices.get(targetId)!)
        );
      }
    }

    if (this.#lowLinks.get(nodeId) === this.#indices.get(nodeId)) {
      this.completeComponent(nodeId);
    }
  }

  /**
   * Builds one completed component by popping a canonical Tarjan root from the traversal stack.
   *
   * @param rootNodeId - Stable ID whose low-link closes the current component.
   */
  private completeComponent(rootNodeId: string): void {
    const members: DeclarationNode[] = [];
    while (true) {
      const memberId = this.#stack.pop();
      if (memberId === undefined) {
        throw new Error('Atlas encountered an invalid empty strongly connected component stack.');
      }
      this.#stackIds.delete(memberId);
      const member = this.#nodesById.get(memberId);
      if (member === undefined) {
        throw new Error(`Atlas could not resolve layout component member '${memberId}'.`);
      }
      members.push(member);
      if (memberId === rootNodeId) {
        break;
      }
    }
    members.sort((left, right) => this.compareNodes(left, right));
    const keyNode = members[0];
    if (keyNode === undefined) {
      throw new Error('Atlas created an empty strongly connected layout component.');
    }
    this.#components.push(new StrongComponent(`component:${keyNode.id}`, keyNode, members));
  }

  /**
   * Returns outgoing target IDs in canonical declaration-node order.
   *
   * @param nodeId - Stable source node ID.
   * @returns Canonically sorted direct target IDs.
   */
  private sortedTargets(nodeId: string): readonly string[] {
    return [...(this.outgoingIds.get(nodeId) ?? [])].sort(
      (left, right) => (this.#nodeOrder.get(left) ?? 0) - (this.#nodeOrder.get(right) ?? 0)
    );
  }

  /**
   * Orders nodes by normalized label then stable identifier.
   *
   * @param left - First node to compare.
   * @param right - Second node to compare.
   * @returns Negative, zero, or positive locale comparison result.
   */
  private compareNodes(left: DeclarationNode, right: DeclarationNode): number {
    const labelOrder = left.label.localeCompare(right.label);
    return labelOrder === 0 ? left.id.localeCompare(right.id) : labelOrder;
  }
}

/**
 * Represents one canonical strongly connected component in the condensed layout graph.
 */
class StrongComponent {
  /**
   * Creates one component with a stable identity and canonically sorted members.
   *
   * @param id - Stable component identifier derived from its canonical first member.
   * @param keyNode - Canonical first member used for ready-component ordering.
   * @param nodes - Component members sorted by normalized label then stable node ID.
   */
  public constructor(
    public readonly id: string,
    public readonly keyNode: DeclarationNode,
    public readonly nodes: readonly DeclarationNode[]
  ) {}
}
