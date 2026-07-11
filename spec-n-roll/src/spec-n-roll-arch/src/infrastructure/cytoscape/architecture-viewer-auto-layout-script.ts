/**
 * Renders the deterministic, hierarchy-aware layout behavior for architecture diagrams.
 */
export class ArchitectureViewerAutoLayoutScript {
  /**
   * Renders the browser classes that group diagram nodes and assign their positions.
   *
   * @returns JavaScript source embedded in architecture viewer HTML pages.
   */
  static render(): string {
    return `
      /**
       * Represents one node or compound-node collection positioned as a unit.
       */
      class DiagramLayoutGroup {
        constructor(element, children = [], padding = 0) {
          this.element = element;
          this.children = children;
          this.padding = padding;
          this.width = 0;
          this.height = 0;
          this.columns = 1;
          this.rows = 1;
          this.rowWidths = [];
          this.rowHeights = [];
          this.layers = [];
        }

        isLeaf() {
          return this.element !== null && this.children.length === 0;
        }
      }

      /**
       * Arranges Cytoscape compound nodes by containment and dependency direction.
       */
      class DiagramAutoLayout {
        constructor(graph) {
          this.graph = graph;
          this.maxColumns = 5;
          this.horizontalGap = 120;
          this.verticalGap = 120;
          this.targetAspectRatio = 3 / 2;
        }

        configure(maxColumns, horizontalGap, verticalGap) {
          this.maxColumns = maxColumns;
          this.horizontalGap = horizontalGap;
          this.verticalGap = verticalGap;
        }

        layout() {
          const rootGroups = this.rootNodes().map((node) => this.createGroup(node));
          if (rootGroups.length === 0) {
            return;
          }

          const rootGroup = this.createLayeredGroup(null, rootGroups);

          this.graph.batch(() => {
            this.measure(rootGroup);
            this.place(rootGroup, -rootGroup.width / 2, 0);
          });
        }

        layoutGroup(node) {
          if (node.children().empty()) {
            return false;
          }

          const group = this.createGroup(node);
          const bounds = node.boundingBox({ includeLabels: true });

          this.graph.batch(() => {
            this.measure(group);
            this.place(group, bounds.x1, bounds.y1);
          });

          return true;
        }

        rootNodes() {
          return this.graph.nodes()
            .not('.collapsed-proxy')
            .filter((node) => node.parent().empty())
            .toArray()
            .sort((left, right) => this.compareNodes(left, right));
        }

        createGroup(node) {
          const children = node.children()
            .not('.collapsed-proxy')
            .toArray()
            .sort((left, right) => this.compareNodes(left, right))
            .map((child) => this.createGroup(child));

          return this.createLayeredGroup(node, children);
        }

        createLayeredGroup(element, children) {
          const group = new DiagramLayoutGroup(
            element,
            children,
            this.compoundPadding(element, children),
          );

          if (children.length > 0) {
            group.layers = this.dependencyLayers(children, element)
              .map((layer) => new DiagramLayoutGroup(null, layer));
          }

          return group;
        }

        compoundPadding(element, children) {
          if (!element || children.length === 0 || typeof element.pstyle !== 'function') {
            return 0;
          }

          const padding = element.pstyle('padding');
          return typeof padding?.pfValue === 'number' ? padding.pfValue : 0;
        }

        dependencyLayers(groups, scopeElement) {
          const groupsById = new Map(
            groups.map((group) => [group.element.id(), group]),
          );
          const inboundGroups = new Map(
            groups.map((group) => [group, new Set()]),
          );
          const outboundGroups = new Map(
            groups.map((group) => [group, new Set()]),
          );

          this.graph.edges().not('.collapsed-proxy').forEach((edge) => {
            const source = this.groupForNode(
              edge.source(),
              groupsById,
              scopeElement,
            );
            const target = this.groupForNode(
              edge.target(),
              groupsById,
              scopeElement,
            );

            if (!source || !target || source === target) {
              return;
            }

            inboundGroups.get(target).add(source);
            outboundGroups.get(source).add(target);
          });

          const remainingGroups = new Set(groups);
          const layers = [];
          let currentLayer = groups.filter(
            (group) => inboundGroups.get(group).size === 0,
          );

          while (currentLayer.length > 0) {
            layers.push(currentLayer);
            currentLayer.forEach((group) => remainingGroups.delete(group));
            currentLayer = [...remainingGroups]
              .filter((group) =>
                [...outboundGroups.entries()].some(
                  ([source, targets]) =>
                    !remainingGroups.has(source) && targets.has(group),
                ),
              )
              .sort((left, right) => this.compareGroups(left, right));
          }

          if (remainingGroups.size > 0) {
            layers.push(
              [...remainingGroups].sort((left, right) =>
                this.compareGroups(left, right),
              ),
            );
          }

          return layers;
        }

        groupForNode(node, groupsById, scopeElement) {
          let candidate = node;
          let parent = candidate.parent();

          while (!parent.empty()) {
            const parentNode = parent.first();
            if (scopeElement && parentNode.id() === scopeElement.id()) {
              return groupsById.get(candidate.id());
            }

            candidate = parentNode;
            parent = candidate.parent();
          }

          return scopeElement ? undefined : groupsById.get(candidate.id());
        }

        measure(group) {
          if (group.isLeaf()) {
            const bounds = group.element.boundingBox({ includeLabels: true });
            group.width = bounds.w;
            group.height = bounds.h;
            return;
          }

          if (group.layers.length > 0) {
            group.layers.forEach((layer) => this.measure(layer));
            group.width =
              Math.max(...group.layers.map((layer) => layer.width)) + group.padding * 2;
            group.height =
              group.layers.reduce((height, layer) => height + layer.height, 0) +
              Math.max(group.layers.length - 1, 0) * this.verticalGap +
              group.padding * 2;
            return;
          }

          group.children.forEach((child) => this.measure(child));
          const grid = this.grid(group.children.length);
          group.columns = grid.columns;
          group.rows = grid.rows;
          group.rowWidths = [];
          group.rowHeights = [];

          let childIndex = 0;
          for (let row = 0; row < group.rows; row += 1) {
            const rowChildren = group.children.slice(
              childIndex,
              childIndex + this.elementsInRow(group, row),
            );
            group.rowWidths.push(
              rowChildren.reduce(
                (width, child) => width + child.width,
                0,
              ) + Math.max(rowChildren.length - 1, 0) * this.horizontalGap,
            );
            group.rowHeights.push(
              Math.max(...rowChildren.map((child) => child.height)),
            );
            childIndex += rowChildren.length;
          }

          group.width = Math.max(...group.rowWidths);
          group.height =
            group.rowHeights.reduce((height, rowHeight) => height + rowHeight, 0) +
            Math.max(group.rows - 1, 0) * this.verticalGap;
        }

        grid(elementCount) {
          if (elementCount <= this.maxColumns) {
            return { columns: Math.max(elementCount, 1), rows: 1 };
          }

          let bestGrid = {
            columns: this.maxColumns,
            rows: Math.ceil(elementCount / this.maxColumns),
          };
          let bestDifference = Number.POSITIVE_INFINITY;

          for (
            let rows = Math.ceil(elementCount / this.maxColumns);
            rows <= elementCount;
            rows += 1
          ) {
            const columns = Math.ceil(elementCount / rows);
            if (columns > this.maxColumns) {
              continue;
            }
            const difference = Math.abs(columns / rows - this.targetAspectRatio);

            if (
              difference < bestDifference ||
              (difference === bestDifference && rows < bestGrid.rows)
            ) {
              bestGrid = { columns, rows };
              bestDifference = difference;
            }
          }

          return bestGrid;
        }

        place(group, left, top) {
          if (group.isLeaf()) {
            group.element.position({
              x: left + group.width / 2,
              y: top + group.height / 2,
            });
            return;
          }

          if (group.layers.length > 0) {
            const contentWidth = group.width - group.padding * 2;
            let layerTop = top + group.padding;
            for (const layer of group.layers) {
              this.place(
                layer,
                left + group.padding + (contentWidth - layer.width) / 2,
                layerTop,
              );
              layerTop += layer.height + this.verticalGap;
            }
            return;
          }

          let childIndex = 0;
          let childTop = top;
          for (let row = 0; row < group.rows; row += 1) {
            const elementsInRow = this.elementsInRow(group, row);
            let childLeft = left + (group.width - group.rowWidths[row]) / 2;

            for (let column = 0; column < elementsInRow; column += 1) {
              const child = group.children[childIndex];
              this.place(
                child,
                childLeft,
                childTop + (group.rowHeights[row] - child.height) / 2,
              );
              childLeft += child.width + this.horizontalGap;
              childIndex += 1;
            }

            childTop += group.rowHeights[row] + this.verticalGap;
          }
        }

        elementsInRow(group, row) {
          const minimumPerRow = Math.floor(group.children.length / group.rows);
          const rowsWithOneMore = group.children.length % group.rows;
          return minimumPerRow + (row < rowsWithOneMore ? 1 : 0);
        }

        compareGroups(left, right) {
          return this.compareNodes(left.element, right.element);
        }

        compareNodes(left, right) {
          return this.nodeLabel(left).localeCompare(this.nodeLabel(right)) ||
            left.id().localeCompare(right.id());
        }

        nodeLabel(node) {
          return String(node.data('label') || node.id());
        }
      }`;
  }
}
