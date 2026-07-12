import type { ArchitectureCollapseFilter } from '#arch/application/config/architecture-collapse-filter.js';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { ArchitectureLandscapeDependencySplitter } from '#arch/application/config/architecture-landscape-dependency-splitter.js';
import type {
  ArchitectureTypeGraph,
  ArchitectureTypeNode,
} from '#arch/application/graph/architecture-type-graph.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
import { DirectoryCytoscapeGroupBuilder } from '#arch/application/graph/directory-cytoscape-group-builder.js';
import { DisconnectedCytoscapeElementPruner } from '#arch/application/graph/disconnected-cytoscape-element-pruner.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Converts declaration graph models into Cytoscape elements for architecture diagram scopes.
 */
export class ArchitectureTypeCytoscapeConverter {
  /**
   * Creates a declaration graph converter.
   *
   * @param directoryGroupBuilder - Builder for compound directory parent nodes.
   * @param disconnectedElementPruner - Pruner used by landscape views.
   */
  constructor(
    private readonly directoryGroupBuilder = new DirectoryCytoscapeGroupBuilder(),
    private readonly disconnectedElementPruner = new DisconnectedCytoscapeElementPruner(),
  ) {}

  /**
   * Converts one package's declaration graph into diagram elements.
   *
   * @param graph - Workspace declaration graph.
   * @param workspacePackage - Package represented by the diagram.
   * @param exclusionFilter - Existing package exclusion policy.
   * @param collapseFilter - Existing external dependency collapse policy.
   * @returns Package compound nodes, declaration nodes, external nodes, and relationships.
   */
  packageElements(
    graph: ArchitectureTypeGraph,
    workspacePackage: WorkspacePackage,
    exclusionFilter?: ArchitectureExclusionFilter,
    collapseFilter?: ArchitectureCollapseFilter,
  ): CytoscapeElement[] {
    const included = graph.nodes.filter(
      (node) =>
        node.packageName === workspacePackage.name &&
        !this.excludes(node, exclusionFilter),
    );
    return this.elements(
      graph,
      included,
      workspacePackage.name,
      (node) => node.packageName === workspacePackage.name,
      (target) => this.packageTarget(target, workspacePackage.name),
      exclusionFilter,
      collapseFilter,
      false,
      true,
    );
  }

  /**
   * Converts declarations inside one configured folder into diagram elements.
   *
   * @param graph - Workspace declaration graph.
   * @param workspacePackage - Package that owns the configured folder.
   * @param folderPath - Package-root-relative source folder path.
   * @param exclusionFilter - Existing folder exclusion policy.
   * @param collapseFilter - Existing external dependency collapse policy.
   * @returns Folder compound nodes, scoped declaration nodes, external nodes, and relationships.
   */
  folderElements(
    graph: ArchitectureTypeGraph,
    workspacePackage: WorkspacePackage,
    folderPath: string,
    exclusionFilter?: ArchitectureExclusionFilter,
    collapseFilter?: ArchitectureCollapseFilter,
  ): CytoscapeElement[] {
    const normalizedFolder = folderPath
      .replaceAll('\\', '/')
      .replace(/^\.\//u, '')
      .replace(/\/$/u, '');
    const prefix = `src/${workspacePackage.name}/${normalizedFolder}/`;
    const included = graph.nodes.filter(
      (node) =>
        node.packageName === workspacePackage.name &&
        (node.sourceFile === prefix.slice(0, -1) ||
          node.sourceFile.startsWith(prefix)) &&
        !this.excludes(node, exclusionFilter),
    );
    const rootId = `folder:${workspacePackage.name}:${normalizedFolder}`;
    const elements = this.elements(
      graph,
      included,
      rootId,
      (node) => included.some((candidate) => candidate.id === node.id),
      (target) => this.folderTarget(target, workspacePackage.name),
      exclusionFilter,
      collapseFilter,
      false,
    );
    return elements.map((element) =>
      element.data.id === rootId
        ? { data: { ...element.data, label: normalizedFolder } }
        : element,
    );
  }

  /**
   * Converts cross-package declaration relationships into landscape diagram elements.
   *
   * @param graph - Workspace declaration graph.
   * @param packages - Runtime packages included in the landscape.
   * @param exclusionFilter - Existing landscape exclusion policy.
   * @param dependencySplitter - Existing external dependency split policy.
   * @returns Package groups with cross-package declaration and external dependency relationships.
   */
  landscapeElements(
    graph: ArchitectureTypeGraph,
    packages: WorkspacePackage[],
    exclusionFilter?: ArchitectureExclusionFilter,
    dependencySplitter?: ArchitectureLandscapeDependencySplitter,
  ): CytoscapeElement[] {
    const allowedPackages = new Set(
      packages.map((workspacePackage) => workspacePackage.name),
    );
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const includedIds = new Set<string>();
    const relationships = graph.relationships.filter((relationship) => {
      const source = nodeById.get(relationship.sourceId);
      if (
        !source ||
        !allowedPackages.has(source.packageName) ||
        this.excludes(source, exclusionFilter)
      )
        return false;
      const target = nodeById.get(relationship.targetId);
      if (target) {
        if (
          target.packageName === source.packageName ||
          this.excludes(target, exclusionFilter)
        )
          return false;
        includedIds.add(source.id);
        includedIds.add(target.id);
        return true;
      }
      if (
        !relationship.targetId.startsWith('external:') ||
        exclusionFilter?.excludesLandscapeDependency(
          this.externalLabel(relationship.targetId),
        )
      )
        return false;
      includedIds.add(source.id);
      return true;
    });
    const packageNodes: CytoscapeElement[] = packages.map(
      (workspacePackage) => ({
        data: {
          id: workspacePackage.name,
          label: workspacePackage.name,
          workspaceDependency: 'true',
        },
      }),
    );
    const declarationNodeMap = new Map<string, CytoscapeElement>();
    for (const node of graph.nodes.filter((candidate) =>
      includedIds.has(candidate.id),
    ))
      for (const element of this.declarationElements(node, node.packageName))
        declarationNodeMap.set(element.data.id, element);
    const externalNodes = new Map<string, CytoscapeElement>();
    const edgeElements = relationships.map((relationship) => {
      const source = nodeById.get(relationship.sourceId)!;
      const target = nodeById.get(relationship.targetId);
      let targetId = relationship.targetId;
      if (!target) {
        targetId =
          dependencySplitter?.nodeId(
            this.externalLabel(targetId),
            source.packageName,
          ) ?? targetId;
        externalNodes.set(targetId, {
          data: {
            id: targetId,
            label: this.externalLabel(relationship.targetId),
            externalDependency: 'true',
            ...(targetId === relationship.targetId
              ? {}
              : {
                  splitExternalDependency: 'true',
                  splitSourcePackage: source.packageName,
                }),
          },
        });
      }
      return this.edge(
        relationship.sourceId,
        targetId,
        relationship.relationshipType,
      );
    });
    return this.disconnectedElementPruner.prune(
      packageNodes.concat(
        [...declarationNodeMap.values()],
        [...externalNodes.values()],
        edgeElements,
      ),
    );
  }

  private elements(
    graph: ArchitectureTypeGraph,
    included: ArchitectureTypeNode[],
    rootId: string,
    acceptsTarget: (node: ArchitectureTypeNode) => boolean,
    externalTarget: (target: ArchitectureTypeNode) => {
      id: string;
      label: string;
    },
    exclusionFilter: ArchitectureExclusionFilter | undefined,
    collapseFilter: ArchitectureCollapseFilter | undefined,
    prune: boolean,
    includeWorkspaceTypes = false,
  ): CytoscapeElement[] {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const includedIds = new Set(included.map((node) => node.id));
    const roots: CytoscapeElement[] = [
      { data: { id: rootId, label: rootId, workspaceDependency: 'true' } },
    ];
    const declarationMap = new Map<string, CytoscapeElement>();
    for (const node of included)
      for (const element of this.declarationElements(node, rootId))
        declarationMap.set(element.data.id, element);
    const externalNodes = new Map<string, CytoscapeElement>();
    const workspaceGroups = new Map<string, CytoscapeElement>();
    const edges: CytoscapeElement[] = [];
    for (const relationship of graph.relationships) {
      if (!includedIds.has(relationship.sourceId)) continue;
      const target = nodeById.get(relationship.targetId);
      if (target && acceptsTarget(target) && includedIds.has(target.id)) {
        edges.push(
          this.edge(
            relationship.sourceId,
            target.id,
            relationship.relationshipType,
          ),
        );
        continue;
      }
      const external = target
        ? externalTarget(target)
        : {
            id: relationship.targetId,
            label: this.externalLabel(relationship.targetId),
          };
      const source = nodeById.get(relationship.sourceId);
      if (
        source &&
        exclusionFilter?.excludesProjectNode(source.packageName, external.label)
      )
        continue;
      const workspaceType =
        includeWorkspaceTypes &&
        target &&
        target.packageName !== source?.packageName &&
        !target.moduleNode;
      if (
        !workspaceType &&
        collapseFilter &&
        !collapseFilter.collapsesExternalDependency(external.label)
      )
        continue;
      let edgeTargetId = external.id;
      if (workspaceType && target) {
        const groupId = `external-package:${target.packageName}`;
        workspaceGroups.set(groupId, {
          data: {
            id: groupId,
            label: target.packageName,
            workspaceDependency: 'true',
          },
        });
        declarationMap.set(target.id, {
          data: {
            id: target.id,
            label: target.label,
            parent: groupId,
            nodeKind: target.nodeKind,
            sourceFile: target.sourceFile,
            packageName: target.packageName,
          },
        });
        edgeTargetId = target.id;
      }
      if (!workspaceType)
        externalNodes.set(external.id, {
          data: {
            id: external.id,
            label: external.label,
            externalDependency: 'true',
          },
        });
      edges.push(
        this.edge(
          relationship.sourceId,
          edgeTargetId,
          relationship.relationshipType,
        ),
      );
    }
    const result = roots.concat(
      [...workspaceGroups.values()],
      [...declarationMap.values()],
      [...externalNodes.values()],
      edges,
    );
    return prune ? this.disconnectedElementPruner.prune(result) : result;
  }

  private declarationElements(
    node: ArchitectureTypeNode,
    rootId: string,
  ): CytoscapeElement[] {
    const relativeSource = node.sourceFile.replace(/^src\/[^/]+\/src\//u, '');
    const grouping = this.directoryGroupBuilder.build(
      node.sourceFile,
      relativeSource,
      rootId,
    );
    return grouping.groups.concat([
      {
        data: {
          id: node.id,
          label: node.label,
          parent: grouping.parentId ?? rootId,
          nodeKind: node.nodeKind,
          sourceFile: node.sourceFile,
          packageName: node.packageName,
          ...(node.moduleNode ? { moduleNode: 'true' } : {}),
        },
      },
    ]);
  }

  private packageTarget(
    target: ArchitectureTypeNode,
    sourcePackageName: string,
  ): { id: string; label: string } {
    return {
      id: `external:${target.packageName}`,
      label:
        target.packageName === sourcePackageName
          ? 'package'
          : target.packageName,
    };
  }
  private folderTarget(
    target: ArchitectureTypeNode,
    sourcePackageName: string,
  ): { id: string; label: string } {
    return target.packageName === sourcePackageName
      ? {
          id: `external:${sourcePackageName}:${this.topLevelPath(target.sourceFile)}`,
          label: this.topLevelPath(target.sourceFile),
        }
      : { id: `external:${target.packageName}`, label: target.packageName };
  }
  private topLevelPath(sourceFile: string): string {
    return (
      sourceFile.replace(/^src\/[^/]+\/src\//u, '').split('/')[0] ?? 'package'
    );
  }
  private edge(
    source: string,
    target: string,
    relationshipType: string,
  ): CytoscapeElement {
    return {
      data: {
        id: `${source}->${target}:${relationshipType}`,
        source,
        target,
        relationshipType,
      },
    };
  }
  private excludes(
    node: ArchitectureTypeNode,
    exclusionFilter?: ArchitectureExclusionFilter,
  ): boolean {
    return (
      exclusionFilter?.excludesProjectNode(
        node.packageName,
        node.sourceFile
          .replace(new RegExp(`^src/${node.packageName}/src/`, 'u'), '')
          .replace(/\.tsx?$/u, ''),
      ) ?? false
    );
  }
  private externalLabel(id: string): string {
    return id.startsWith('external:') ? id.slice('external:'.length) : id;
  }
}
