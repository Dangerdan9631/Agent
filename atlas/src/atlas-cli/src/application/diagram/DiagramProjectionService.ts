import type {
  AtlasDiagramConfiguration,
  AtlasExternalDependencyImporterSplit,
  AtlasFolderDiagramConfiguration,
  AtlasModuleGroupConfiguration,
  AtlasPackageDiagramConfiguration
} from '#application/configuration/model/AtlasConfiguration.js';
import { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import {
  DeclarationNode,
  DeclarationRelationship,
  DeclarationGraph
} from '#application/graph/model/DeclarationGraph.js';
import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { minimatch } from 'minimatch';

/**
 * Projects semantic declarations into configured landscape, package, and opt-in folder diagram scopes.
 */
export class DiagramProjectionService {
  /**
   * Creates every configured scope after applying global diagram graph-shaping policy.
   *
   * @param workspace - Loaded workspace package classifications and diagram policy.
   * @param graph - Complete workspace declaration graph.
   * @returns Scope graphs sorted with landscape first, then packages and folders by stable scope.
   */
  public project(workspace: WorkspaceSnapshot, graph: DeclarationGraph): readonly DiagramGraph[] {
    const policy = new DiagramProjectionPolicy(workspace.configuration.diagrams, undefined);
    const shapedGraph = this.applyPolicy(graph, policy, true);
    const landscape = this.createLandscape(shapedGraph);
    const packageDiagrams = this.toModuleScopeIds(workspace, shapedGraph).map((moduleId) =>
      this.createPackageDiagram(moduleId, shapedGraph)
    );
    const groupDiagrams = (workspace.configuration.diagrams?.moduleGroups ?? [])
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((group) => this.createModuleGroupDiagram(group, shapedGraph));
    const folderDiagrams = (workspace.configuration.diagrams?.folders ?? [])
      .slice()
      .sort((left, right) => this.toFolderScope(left).localeCompare(this.toFolderScope(right)))
      .map((folder) => this.createFolderDiagram(workspace, graph, folder));

    return [landscape, ...packageDiagrams, ...groupDiagrams, ...folderDiagrams];
  }

  /**
   * Selects runtime package aliases and manifest-only module IDs for module diagram generation.
   *
   * @param workspace - Loaded configuration and compatibility package selection.
   * @param graph - Policy-shaped graph that exposes all selected federated module owners.
   * @returns Sorted module identities represented by individual diagrams.
   */
  private toModuleScopeIds(
    workspace: WorkspaceSnapshot,
    graph: DeclarationGraph
  ): readonly string[] {
    const runtimePackageNames = workspace.packages
      .filter((workspacePackage) => workspacePackage.classification === 'runtime')
      .map((workspacePackage) => workspacePackage.name);
    const graphModuleIds = graph.nodes
      .map((node) => node.packageName)
      .filter((moduleId): moduleId is string => moduleId !== undefined);
    return [...new Set([...runtimePackageNames, ...graphModuleIds])].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  /**
   * Creates the complete workspace landscape graph.
   *
   * @param graph - Policy-shaped declaration graph.
   * @returns Workspace-wide landscape diagram graph.
   */
  private createLandscape(graph: DeclarationGraph): DiagramGraph {
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const relationships = graph.relationships.filter((relationship) => {
      const source = nodesById.get(relationship.sourceId);
      const target = nodesById.get(relationship.targetId);
      return (
        source !== undefined && target !== undefined && source.packageName !== target.packageName
      );
    });
    const nodeIds = new Set(
      relationships.flatMap((relationship) => [relationship.sourceId, relationship.targetId])
    );
    return this.toGraph(
      'landscape',
      'Workspace Landscape',
      graph.nodes.filter((node) => nodeIds.has(node.id)),
      relationships
    );
  }

  /**
   * Creates a package graph with local nodes and only directly connected declarations or externals.
   *
   * @param packageName - Runtime package manifest name.
   * @param graph - Policy-shaped complete declaration graph.
   * @returns Focused package diagram graph.
   */
  private createPackageDiagram(packageName: string, graph: DeclarationGraph): DiagramGraph {
    const includedNodeIds = new Set(
      graph.nodes.filter((node) => node.packageName === packageName).map((node) => node.id)
    );
    for (const relationship of graph.relationships) {
      if (includedNodeIds.has(relationship.sourceId)) {
        includedNodeIds.add(relationship.targetId);
      }
      if (includedNodeIds.has(relationship.targetId)) {
        includedNodeIds.add(relationship.sourceId);
      }
    }
    return this.toGraph(
      `package:${packageName}`,
      `Package: ${packageName}`,
      graph.nodes.filter((node) => includedNodeIds.has(node.id)),
      graph.relationships.filter(
        (relationship) =>
          includedNodeIds.has(relationship.sourceId) && includedNodeIds.has(relationship.targetId)
      )
    );
  }

  /**
   * Creates a presentation-only artifact group diagram without merging canonical artifact identities.
   *
   * @param group - Stable configured group and module-ID matching policy.
   * @param graph - Policy-shaped complete graph.
   * @returns Focused group graph with directly connected declarations and external targets.
   */
  private createModuleGroupDiagram(
    group: AtlasModuleGroupConfiguration,
    graph: DeclarationGraph
  ): DiagramGraph {
    const includedNodeIds = new Set(
      graph.nodes
        .filter(
          (node) =>
            node.packageName !== undefined &&
            group.moduleIdPatterns.some((pattern) =>
              minimatch(node.packageName ?? '', pattern.replaceAll('\\', '/'), { dot: true })
            )
        )
        .map((node) => node.id)
    );
    for (const relationship of graph.relationships) {
      if (includedNodeIds.has(relationship.sourceId)) includedNodeIds.add(relationship.targetId);
      if (includedNodeIds.has(relationship.targetId)) includedNodeIds.add(relationship.sourceId);
    }
    return this.toGraph(
      `group:${group.id}`,
      group.title,
      graph.nodes.filter((node) => includedNodeIds.has(node.id)),
      graph.relationships.filter(
        (relationship) =>
          includedNodeIds.has(relationship.sourceId) && includedNodeIds.has(relationship.targetId)
      )
    );
  }

  /**
   * Creates one configured folder graph and models any direct outside declarations as boundary nodes.
   *
   * @param workspace - Loaded workspace used to resolve the configured package.
   * @param graph - Complete unshaped declaration graph from which folder-local membership is selected.
   * @param folder - Valid schema-level folder diagram configuration.
   * @returns Focused folder graph with direct outside references represented as external boundaries.
   */
  private createFolderDiagram(
    workspace: WorkspaceSnapshot,
    graph: DeclarationGraph,
    folder: AtlasFolderDiagramConfiguration
  ): DiagramGraph {
    const workspacePackage = workspace.packages.find(
      (candidate) => candidate.name === folder.packageName
    );
    if (workspacePackage === undefined) {
      throw new Error(`Atlas folder diagram references unknown package '${folder.packageName}'.`);
    }
    const policy = new DiagramProjectionPolicy(workspace.configuration.diagrams, folder);
    const shapedGraph = this.applyPolicy(graph, policy, false);
    const folderPrefix = this.toWorkspaceFolderPrefix(workspacePackage, folder.path);
    const localNodeIds = new Set(
      shapedGraph.nodes
        .filter(
          (node) =>
            node.packageName === workspacePackage.name &&
            node.sourcePath !== undefined &&
            (node.sourcePath === folderPrefix || node.sourcePath.startsWith(`${folderPrefix}/`))
        )
        .map((node) => node.id)
    );
    if (localNodeIds.size === 0) {
      throw new Error(
        `Atlas folder diagram '${this.toFolderScope(folder)}' does not contain any included declarations.`
      );
    }
    const nodesById = new Map(
      shapedGraph.nodes.filter((node) => localNodeIds.has(node.id)).map((node) => [node.id, node])
    );
    const relationships: DeclarationRelationship[] = [];
    for (const relationship of shapedGraph.relationships) {
      const sourceIsLocal = localNodeIds.has(relationship.sourceId);
      const targetIsLocal = localNodeIds.has(relationship.targetId);
      if (!sourceIsLocal && !targetIsLocal) {
        continue;
      }
      const sourceId = this.toFolderEndpoint(
        relationship.sourceId,
        nodesById,
        shapedGraph.nodes,
        localNodeIds
      );
      const targetId = this.toFolderEndpoint(
        relationship.targetId,
        nodesById,
        shapedGraph.nodes,
        localNodeIds
      );
      relationships.push(
        new DeclarationRelationship(
          `relationship:${encodeURIComponent(sourceId)}>${encodeURIComponent(targetId)}:${relationship.type}`,
          sourceId,
          targetId,
          relationship.type
        )
      );
    }
    return this.toGraph(
      this.toFolderScope(folder),
      folder.title ?? `Folder: ${folder.packageName}/${this.normalizeFolderPath(folder.path)}`,
      [...nodesById.values()],
      relationships
    );
  }

  /**
   * Resolves a folder graph endpoint, introducing a stable boundary node for an outside local declaration.
   *
   * @param nodeId - Original complete-graph node identifier.
   * @param nodesById - Mutable selected scope nodes keyed by graph node ID.
   * @param allNodes - Complete policy-shaped graph nodes.
   * @param localNodeIds - Folder-local node identifiers.
   * @returns Existing local/external node ID or a stable synthetic boundary ID.
   */
  private toFolderEndpoint(
    nodeId: string,
    nodesById: Map<string, DeclarationNode>,
    allNodes: readonly DeclarationNode[],
    localNodeIds: ReadonlySet<string>
  ): string {
    if (localNodeIds.has(nodeId)) {
      return nodeId;
    }
    const node = allNodes.find((candidate) => candidate.id === nodeId);
    if (node === undefined) {
      return nodeId;
    }
    if (node.kind === 'external') {
      nodesById.set(node.id, node);
      return node.id;
    }
    const boundaryId = `boundary:${encodeURIComponent(node.id)}`;
    if (!nodesById.has(boundaryId)) {
      nodesById.set(
        boundaryId,
        new DeclarationNode(
          boundaryId,
          `${node.packageName ?? 'external'}: ${node.label}`,
          'external',
          undefined,
          undefined,
          false
        )
      );
    }
    return boundaryId;
  }

  /**
   * Applies exclusions, configured external collapsing, and optional landscape importer splitting to a complete graph.
   *
   * @param graph - Complete declaration graph.
   * @param policy - Effective policy after global inheritance and optional folder overrides.
   * @param allowExternalSplitting - Determines whether landscape importer splitting may be applied.
   * @returns Deterministically shaped graph.
   */
  private applyPolicy(
    graph: DeclarationGraph,
    policy: DiagramProjectionPolicy,
    allowExternalSplitting: boolean
  ): DeclarationGraph {
    const visibleNodeIds = new Set(
      graph.nodes.filter((node) => policy.includes(node)).map((node) => node.id)
    );
    const includedRelationships = graph.relationships.filter(
      (relationship) =>
        visibleNodeIds.has(relationship.sourceId) && visibleNodeIds.has(relationship.targetId)
    );
    const nodesById = new Map(
      graph.nodes.filter((node) => visibleNodeIds.has(node.id)).map((node) => [node.id, node])
    );
    const relationships = this.shapeExternalDependencies(
      nodesById,
      includedRelationships,
      policy,
      allowExternalSplitting
    );
    const relationshipNodeIds = new Set(
      relationships.flatMap((relationship) => [relationship.sourceId, relationship.targetId])
    );
    return new DeclarationGraph(
      [...nodesById.values()].filter(
        (node) => relationshipNodeIds.has(node.id) || node.kind !== 'external'
      ),
      relationships
    );
  }

  /**
   * Applies the effective collapse and importer-splitting policy to external relationship targets.
   *
   * @param nodesById - Mutable visible nodes keyed by ID.
   * @param relationships - Visible graph relationships.
   * @param policy - Effective external dependency rendering policy.
   * @param allowExternalSplitting - Determines whether importer-specific external clones are allowed.
   * @returns Relationships targeting the configured external dependency representation.
   */
  private shapeExternalDependencies(
    nodesById: Map<string, DeclarationNode>,
    relationships: readonly DeclarationRelationship[],
    policy: DiagramProjectionPolicy,
    allowExternalSplitting: boolean
  ): readonly DeclarationRelationship[] {
    return relationships.map((relationship) => {
      const sourceNode = nodesById.get(relationship.sourceId);
      const targetNode = nodesById.get(relationship.targetId);
      if (targetNode === undefined || targetNode.kind !== 'external') {
        return relationship;
      }
      if (!policy.collapses(targetNode.label)) {
        return this.createExternalClone(
          nodesById,
          relationship,
          targetNode,
          `source:${encodeURIComponent(relationship.sourceId)}`
        );
      }
      if (
        allowExternalSplitting &&
        sourceNode?.packageName !== undefined &&
        policy.splitsByImporter(targetNode.label, sourceNode.packageName)
      ) {
        return this.createExternalClone(
          nodesById,
          relationship,
          targetNode,
          `importer:${encodeURIComponent(sourceNode.packageName)}`
        );
      }
      return relationship;
    });
  }

  /**
   * Creates a stable clone of an external target and redirects one relationship to it.
   *
   * @param nodesById - Mutable visible nodes keyed by ID.
   * @param relationship - Relationship that requires a cloned target.
   * @param targetNode - Visible external dependency being cloned.
   * @param cloneSuffix - Stable clone identity scoped to its source declaration or importing package.
   * @returns Relationship targeting the external clone.
   */
  private createExternalClone(
    nodesById: Map<string, DeclarationNode>,
    relationship: DeclarationRelationship,
    targetNode: DeclarationNode,
    cloneSuffix: string
  ): DeclarationRelationship {
    const clonedTargetId = `${targetNode.id}:${cloneSuffix}`;
    if (!nodesById.has(clonedTargetId)) {
      nodesById.set(
        clonedTargetId,
        new DeclarationNode(
          clonedTargetId,
          targetNode.label,
          'external',
          undefined,
          undefined,
          false
        )
      );
    }
    return new DeclarationRelationship(
      `relationship:${encodeURIComponent(relationship.sourceId)}>${encodeURIComponent(clonedTargetId)}:${relationship.type}`,
      relationship.sourceId,
      clonedTargetId,
      relationship.type
    );
  }

  /**
   * Creates a sorted immutable diagram graph from selected node and relationship collections.
   *
   * @param scope - Stable generated diagram scope.
   * @param title - Human-readable diagram title.
   * @param nodes - Included diagram nodes.
   * @param relationships - Included diagram relationships.
   * @returns Deterministically ordered diagram graph.
   */
  private toGraph(
    scope: DiagramGraph['scope'],
    title: string,
    nodes: readonly DeclarationNode[],
    relationships: readonly DeclarationRelationship[]
  ): DiagramGraph {
    return new DiagramGraph(
      scope,
      title,
      [...nodes].sort((left, right) => left.id.localeCompare(right.id)),
      [...relationships].sort((left, right) => {
        const sourceOrder = left.sourceId.localeCompare(right.sourceId);
        if (sourceOrder !== 0) {
          return sourceOrder;
        }
        const targetOrder = left.targetId.localeCompare(right.targetId);
        return targetOrder === 0 ? left.type.localeCompare(right.type) : targetOrder;
      })
    );
  }

  /**
   * Converts a package-local folder path into a normalized workspace-relative prefix.
   *
   * @param workspacePackage - Package that owns the configured folder.
   * @param folderPath - Schema-validated package-local folder path.
   * @returns Workspace-relative folder prefix used for declaration membership.
   */
  private toWorkspaceFolderPrefix(workspacePackage: WorkspacePackage, folderPath: string): string {
    const normalizedPath = this.normalizeFolderPath(folderPath);
    return workspacePackage.relativeRootPath === '.'
      ? normalizedPath
      : `${workspacePackage.relativeRootPath}/${normalizedPath}`;
  }

  /**
   * Normalizes a schema-validated package-local folder path for IDs and prefix matching.
   *
   * @param folderPath - User-owned package-local folder path.
   * @returns Slash-normalized path without leading or trailing separators.
   */
  private normalizeFolderPath(folderPath: string): string {
    return folderPath.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
  }

  /**
   * Creates the stable public scope identity for one configured folder diagram.
   *
   * @param folder - Folder diagram configuration.
   * @returns Stable folder scope identifier.
   */
  private toFolderScope(folder: AtlasFolderDiagramConfiguration): `folder:${string}:${string}` {
    return `folder:${folder.packageName}:${this.normalizeFolderPath(folder.path)}`;
  }
}

/**
 * Merges global and folder-level diagram policy and matches nodes against normalized configured globs.
 */
class DiagramProjectionPolicy {
  /**
   * Creates effective graph-shaping policy from global settings and optional folder overrides.
   *
   * @param globalConfiguration - Optional workspace-level diagram configuration.
   * @param folderConfiguration - Optional folder-level configuration inheriting global settings.
   */
  public constructor(
    globalConfiguration: AtlasDiagramConfiguration | undefined,
    folderConfiguration: AtlasFolderDiagramConfiguration | undefined
  ) {
    this.excludeSourceGlobs = [
      ...(globalConfiguration?.excludeSourceGlobs ?? []),
      ...(folderConfiguration?.excludeSourceGlobs ?? [])
    ];
    this.excludeExternalDependencies = [
      ...(globalConfiguration?.excludeExternalDependencies ?? []),
      ...(folderConfiguration?.excludeExternalDependencies ?? [])
    ];
    this.packageConfigurations = globalConfiguration?.packages ?? [];
    this.splitExternalDependenciesByImporter =
      folderConfiguration?.splitExternalDependenciesByImporter ??
      globalConfiguration?.splitExternalDependenciesByImporter ??
      false;
    this.collapseExternalDependencyGlobs =
      globalConfiguration?.collapseExternalDependencyGlobs ?? [];
    this.externalDependencyImporterSplits = [
      ...(globalConfiguration?.externalDependencyImporterSplits ?? []),
      ...(folderConfiguration?.externalDependencyImporterSplits ?? [])
    ];
    this.collapseExternalDependencies =
      folderConfiguration?.collapseExternalDependencies ??
      globalConfiguration?.collapseExternalDependencies ??
      true;
  }

  /**
   * Source-path exclusion patterns inherited by this effective policy.
   */
  public readonly excludeSourceGlobs: readonly string[];

  /**
   * External-label exclusion patterns inherited by this effective policy.
   */
  public readonly excludeExternalDependencies: readonly string[];

  /**
   * Package-specific policies used to add source exclusions based on a node's declared owner.
   */
  public readonly packageConfigurations: readonly AtlasPackageDiagramConfiguration[];

  /**
   * Determines whether external targets should be cloned by importing package in landscape projection.
   */
  public readonly splitExternalDependenciesByImporter: boolean;

  /**
   * Determines whether one normalized external dependency node is shared by all importing declarations.
   */
  public readonly collapseExternalDependencies: boolean;

  /**
   * External dependency labels that remain collapsed when global collapsing is disabled.
   */
  public readonly collapseExternalDependencyGlobs: readonly string[];

  /**
   * External dependency and importer package combinations that use package-keyed landscape clones.
   */
  public readonly externalDependencyImporterSplits: readonly AtlasExternalDependencyImporterSplit[];

  /**
   * Determines whether an external label remains represented by one shared dependency node.
   *
   * @param label - Stable external dependency label.
   * @returns True when the label should use its shared external node.
   */
  public collapses(label: string): boolean {
    return (
      this.collapseExternalDependencies ||
      this.collapseExternalDependencyGlobs.some((pattern) => this.matches(label, pattern))
    );
  }

  /**
   * Determines whether a collapsed external label receives an importer-keyed landscape clone.
   *
   * @param label - Stable external dependency label.
   * @param packageName - Exact importing workspace package name.
   * @returns True when the dependency should be split for the importing package.
   */
  public splitsByImporter(label: string, packageName: string): boolean {
    return (
      this.splitExternalDependenciesByImporter ||
      this.externalDependencyImporterSplits.some(
        (split) => this.matches(label, split.dependency) && split.packageNames.includes(packageName)
      )
    );
  }

  /**
   * Determines whether one semantic graph node remains visible after effective exclusions.
   *
   * @param node - Semantic declaration or external dependency node.
   * @returns True when the node is included in the shaped graph.
   */
  public includes(node: DeclarationNode): boolean {
    if (node.kind === 'external') {
      return !this.excludeExternalDependencies.some((pattern) => this.matches(node.label, pattern));
    }
    if (node.sourcePath === undefined) {
      return false;
    }
    const sourcePath = node.sourcePath;
    const packageExclusions = this.packageConfigurations
      .filter((configuration) => configuration.packageName === node.packageName)
      .flatMap((configuration) => configuration.excludeSourceGlobs ?? []);
    return ![...this.excludeSourceGlobs, ...packageExclusions].some((pattern) =>
      this.matches(sourcePath, pattern)
    );
  }

  /**
   * Matches a normalized graph value against one user-owned slash-normalized glob.
   *
   * @param value - Node source path or external label.
   * @param pattern - User-owned source or external exclusion pattern.
   * @returns True when the pattern excludes the value.
   */
  private matches(value: string, pattern: string): boolean {
    return minimatch(value, pattern.replaceAll('\\', '/'), { dot: true });
  }
}
