import { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import type { DiagramArtifactWriter } from '#application/diagram/ports/DiagramArtifactWriter.js';
import {
  DeclarationNode,
  DeclarationRelationship,
  type DeclarationNodeKind,
  type DeclarationRelationshipType
} from '#application/graph/model/DeclarationGraph.js';
import type { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import {
  LayoutDocument,
  LayoutPosition,
  LayoutSettings
} from '#application/layout/model/LayoutDocument.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { LegacyAutoLayoutScript } from '#infrastructure/artifacts/LegacyAutoLayoutScript.js';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Writes deterministic Cytoscape-compatible graph JSON, matrix HTML, viewer shells, and navigation pages.
 */
export class NodeDiagramArtifactWriter implements DiagramArtifactWriter {
  /**
   * Creates artifact persistence with deterministic layout calculation.
   *
   * @param layoutService - Produces generated positions while preserving valid saved layout state.
   */
  public constructor(private readonly layoutService: DeterministicLayoutService) {}

  /**
   * Persists every scope graph and an always-expanded cross-scope navigation page.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagrams - Scope graphs to persist.
   * @returns A promise that resolves when every artifact has been atomically replaced.
   */
  public async write(
    workspace: WorkspaceSnapshot,
    diagrams: readonly DiagramGraph[]
  ): Promise<void> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot write diagrams before resolving an artifact root.');
    }

    await mkdir(artifactRootPath, { recursive: true });
    await this.copyViewerAssets(artifactRootPath);
    const sortedDiagrams = [...diagrams].sort((left, right) =>
      left.scope.localeCompare(right.scope)
    );
    const navigation = this.createNavigation(sortedDiagrams);

    await Promise.all(
      sortedDiagrams.map((diagram) =>
        this.writeDiagram(workspace, artifactRootPath, diagram, navigation)
      )
    );

    await this.writeAtomically(
      this.resolveContainedPath(artifactRootPath, 'navigation.html'),
      this.createNavigationPage(navigation)
    );
    await this.writeArtifactIndex(artifactRootPath, sortedDiagrams);
    const landscape = sortedDiagrams.find((diagram) => diagram.scope === 'landscape');
    if (landscape !== undefined) {
      await this.writeAtomically(
        this.resolveContainedPath(artifactRootPath, 'index.html'),
        this.createViewerPage(workspace, landscape, navigation, true)
      );
    }
  }

  /** Copies the package-owned Cytoscape runtime into the generated artifact root. */
  private async copyViewerAssets(artifactRootPath: string): Promise<void> {
    const assetsDirectoryPath = this.resolveContainedPath(artifactRootPath, 'assets');
    await mkdir(assetsDirectoryPath, { recursive: true });
    await copyFile(
      createRequire(import.meta.url).resolve('cytoscape/dist/cytoscape.min.js'),
      this.resolveContainedPath(assetsDirectoryPath, 'cytoscape.min.js')
    );
  }

  /**
   * Writes one selected scope without rewriting unrelated graph scope artifacts.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagram - Only graph scope whose artifacts may be rewritten.
   * @param allDiagrams - Full projected scope set used to render shared navigation.
   * @returns A promise that resolves after scoped artifacts and navigation are atomically persisted.
   */
  public async writeScope(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph,
    allDiagrams: readonly DiagramGraph[]
  ): Promise<void> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot write diagrams before resolving an artifact root.');
    }
    await mkdir(artifactRootPath, { recursive: true });
    await this.copyViewerAssets(artifactRootPath);
    const navigation = this.createNavigation(
      [...allDiagrams].sort((left, right) => left.scope.localeCompare(right.scope))
    );
    await this.writeDiagram(workspace, artifactRootPath, diagram, navigation);
    await this.writeAtomically(
      this.resolveContainedPath(artifactRootPath, 'navigation.html'),
      this.createNavigationPage(navigation)
    );
    await this.writeArtifactIndex(
      artifactRootPath,
      [...allDiagrams].sort((left, right) => left.scope.localeCompare(right.scope))
    );
    if (diagram.scope === 'landscape') {
      await this.writeAtomically(
        this.resolveContainedPath(artifactRootPath, 'index.html'),
        this.createViewerPage(workspace, diagram, navigation, true)
      );
    }
  }

  /**
   * Writes the Electron-consumable scope index without embedding browser presentation assets.
   *
   * @param artifactRootPath - Absolute generated artifact root.
   * @param diagrams - Every generated scope represented by the index.
   * @returns A promise resolving after the index has been atomically persisted.
   */
  private async writeArtifactIndex(
    artifactRootPath: string,
    diagrams: readonly DiagramGraph[]
  ): Promise<void> {
    await this.writeAtomically(
      this.resolveContainedPath(artifactRootPath, 'atlas-diagrams.json'),
      this.serialize({
        schemaVersion: 1,
        diagrams: diagrams.map((diagram) => ({
          scope: diagram.scope,
          title: diagram.title,
          graphPath: `${this.toScopeDirectoryName(diagram.scope)}/graph.json`,
          layoutPath: `${this.toScopeDirectoryName(diagram.scope)}/layout.json`
        }))
      })
    );
  }

  /**
   * Writes graph data, a viewer shell, and a dependency matrix for one diagram scope.
   *
   * @param artifactRootPath - Absolute configured artifact root.
   * @param diagram - Scope graph to persist.
   * @param navigation - Fully rendered navigation metadata.
   * @returns A promise that resolves after scope files have been written.
   */
  private async writeDiagram(
    workspace: WorkspaceSnapshot,
    artifactRootPath: string,
    diagram: DiagramGraph,
    navigation: readonly DiagramNavigationItem[]
  ): Promise<void> {
    const scopeDirectoryPath = this.resolveContainedPath(
      artifactRootPath,
      this.toScopeDirectoryName(diagram.scope)
    );
    await mkdir(scopeDirectoryPath, { recursive: true });
    const graphDocument = this.createGraphDocument(workspace, diagram);
    const layoutPath = this.resolveContainedPath(scopeDirectoryPath, 'layout.json');
    const savedLayout = await this.readSavedLayout(layoutPath);
    const layout = this.layoutService.layout(
      diagram,
      savedLayout,
      this.createLayoutSettings(workspace)
    );

    await this.writeAtomically(
      this.resolveContainedPath(scopeDirectoryPath, 'graph.json'),
      this.serialize(graphDocument)
    );
    await this.writeLayout(workspace, diagram, layout);
    await this.writeAtomically(
      this.resolveContainedPath(scopeDirectoryPath, 'index.html'),
      this.createViewerPage(workspace, diagram, navigation)
    );
    await this.writeAtomically(
      this.resolveContainedPath(scopeDirectoryPath, 'matrix.html'),
      this.createMatrixPage(diagram, navigation)
    );
  }

  /**
   * Persists one complete scoped layout document without rewriting graph or viewer artifacts.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagram - Scope graph whose layout path is selected.
   * @param layout - Canonical layout document to persist.
   * @returns A promise that resolves after atomic layout replacement.
   */
  public async writeLayout(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph,
    layout: LayoutDocument
  ): Promise<void> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot write layouts before resolving an artifact root.');
    }
    const scopeDirectoryPath = this.resolveContainedPath(
      artifactRootPath,
      this.toScopeDirectoryName(diagram.scope)
    );
    await mkdir(scopeDirectoryPath, { recursive: true });
    await this.writeAtomically(
      this.resolveContainedPath(scopeDirectoryPath, 'layout.json'),
      this.serialize(layout)
    );
  }

  /**
   * Reads one compatible existing layout document without mutating the artifact root.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param diagram - Scope graph whose layout path is selected.
   * @returns Compatible saved layout, or undefined when no valid persisted layout exists.
   */
  public async readLayout(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph
  ): Promise<LayoutDocument | undefined> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot read layouts before resolving an artifact root.');
    }
    const scopeDirectoryPath = this.resolveContainedPath(
      artifactRootPath,
      this.toScopeDirectoryName(diagram.scope)
    );
    return this.readSavedLayout(this.resolveContainedPath(scopeDirectoryPath, 'layout.json'));
  }

  /**
   * Reads one generated graph document for layout without traversing TypeScript source again.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param scope - Existing stable generated scope identifier.
   * @returns Reconstructed diagram graph, or undefined when the artifact cannot be used.
   */
  public async readDiagram(
    workspace: WorkspaceSnapshot,
    scope: DiagramGraph['scope']
  ): Promise<DiagramGraph | undefined> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot read diagrams before resolving an artifact root.');
    }
    try {
      const scopeDirectoryPath = this.resolveContainedPath(
        artifactRootPath,
        this.toScopeDirectoryName(scope)
      );
      return this.parseDiagramGraph(
        JSON.parse(
          await readFile(this.resolveContainedPath(scopeDirectoryPath, 'graph.json'), 'utf8')
        ),
        scope
      );
    } catch {
      return undefined;
    }
  }

  /**
   * Reconstructs a diagram model from one generated Cytoscape document while ignoring compound containers.
   *
   * @param value - Parsed generated graph document.
   * @param expectedScope - Scope selected by the caller and required in the serialized graph.
   * @returns Reconstructed semantic diagram, or undefined when the document is malformed.
   */
  private parseDiagramGraph(
    value: unknown,
    expectedScope: DiagramGraph['scope']
  ): DiagramGraph | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const document = value as Record<string, unknown>;
    const elements = document.elements;
    if (
      document.scope !== expectedScope ||
      typeof document.title !== 'string' ||
      typeof elements !== 'object' ||
      elements === null
    ) {
      return undefined;
    }
    const serializedElements = elements as Record<string, unknown>;
    if (!Array.isArray(serializedElements.nodes) || !Array.isArray(serializedElements.edges)) {
      return undefined;
    }
    const nodes = serializedElements.nodes
      .filter((entry) => this.readGraphElementData(entry)?.compound !== true)
      .map((entry) => this.readDeclarationNode(entry));
    const relationships = serializedElements.edges.map((entry) =>
      this.readDeclarationRelationship(entry)
    );
    if (
      nodes.some((node) => node === undefined) ||
      relationships.some((edge) => edge === undefined)
    ) {
      return undefined;
    }
    return new DiagramGraph(
      expectedScope,
      document.title,
      nodes as readonly DeclarationNode[],
      relationships as readonly DeclarationRelationship[]
    );
  }

  /**
   * Reads one declaration node from a serialized non-compound graph element.
   *
   * @param value - Parsed Cytoscape node element.
   * @returns Reconstructed declaration node, or undefined when required fields are invalid.
   */
  private readDeclarationNode(value: unknown): DeclarationNode | undefined {
    const data = this.readGraphElementData(value);
    if (
      data === undefined ||
      data.compound === true ||
      typeof data.id !== 'string' ||
      typeof data.label !== 'string' ||
      !this.isDeclarationNodeKind(data.kind) ||
      (typeof data.packageName !== 'string' && data.packageName !== undefined) ||
      (typeof data.sourcePath !== 'string' && data.sourcePath !== undefined) ||
      (typeof data.sourceLanguage !== 'string' && data.sourceLanguage !== undefined) ||
      typeof data.moduleNode !== 'boolean'
    ) {
      return undefined;
    }
    return new DeclarationNode(
      data.id,
      data.label,
      data.kind,
      data.packageName,
      data.sourcePath,
      data.moduleNode,
      data.sourceLanguage
    );
  }

  /**
   * Reads one declaration relationship from a serialized graph edge element.
   *
   * @param value - Parsed Cytoscape edge element.
   * @returns Reconstructed relationship, or undefined when required fields are invalid.
   */
  private readDeclarationRelationship(value: unknown): DeclarationRelationship | undefined {
    const data = this.readGraphElementData(value);
    if (
      data === undefined ||
      typeof data.id !== 'string' ||
      typeof data.source !== 'string' ||
      typeof data.target !== 'string' ||
      !this.isRelationshipType(data.relationshipType)
    ) {
      return undefined;
    }
    return new DeclarationRelationship(data.id, data.source, data.target, data.relationshipType);
  }

  /**
   * Extracts the data record from one serialized Cytoscape element.
   *
   * @param value - Parsed graph node or edge element.
   * @returns Element data record, or undefined when malformed.
   */
  private readGraphElementData(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const data = (value as Record<string, unknown>).data;
    return typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : undefined;
  }

  /**
   * Determines whether a serialized node kind is supported by the declaration model.
   *
   * @param value - Candidate graph node kind.
   * @returns True when the value can create a declaration node.
   */
  private isDeclarationNodeKind(value: unknown): value is DeclarationNodeKind {
    return (
      value === 'class' ||
      value === 'interface' ||
      value === 'type-alias' ||
      value === 'enum' ||
      value === 'function' ||
      value === 'field' ||
      value === 'constant' ||
      value === 'module' ||
      value === 'external'
    );
  }

  /**
   * Determines whether a serialized relationship type is supported by the declaration model.
   *
   * @param value - Candidate graph relationship type.
   * @returns True when the value can create a declaration relationship.
   */
  private isRelationshipType(value: unknown): value is DeclarationRelationshipType {
    return value === 'reference' || value === 'inheritance';
  }

  /**
   * Reads prior persisted layout state when it is compatible with the current schema.
   *
   * @param layoutPath - Absolute contained layout artifact path.
   * @returns Compatible saved layout, or undefined when no valid persisted layout exists.
   */
  private async readSavedLayout(layoutPath: string): Promise<LayoutDocument | undefined> {
    try {
      const parsedValue: unknown = JSON.parse(await readFile(layoutPath, 'utf8'));
      if (!this.isLayoutDocument(parsedValue)) {
        return undefined;
      }
      return new LayoutDocument(
        1,
        parsedValue.positions.map(
          (position) =>
            new LayoutPosition(position.nodeId, position.parentId, position.x, position.y)
        ),
        [...parsedValue.hiddenRelationshipIds]
      );
    } catch {
      return undefined;
    }
  }

  /**
   * Narrows an untrusted JSON value to Atlas's version-one layout document shape.
   *
   * @param value - Parsed JSON value.
   * @returns True when the value can safely be used as persisted layout state.
   */
  private isLayoutDocument(value: unknown): value is PersistedLayoutDocument {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const document = value as Record<string, unknown>;
    return (
      document.schemaVersion === 1 &&
      Array.isArray(document.positions) &&
      Array.isArray(document.hiddenRelationshipIds) &&
      document.positions.every(this.isLayoutPosition.bind(this)) &&
      document.hiddenRelationshipIds.every((relationshipId) => typeof relationshipId === 'string')
    );
  }

  /**
   * Narrows one untrusted persisted position to its version-one representation.
   *
   * @param value - Parsed JSON position candidate.
   * @returns True when the position contains valid primitive fields.
   */
  private isLayoutPosition(value: unknown): value is PersistedLayoutPosition {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const position = value as Record<string, unknown>;
    return (
      typeof position.nodeId === 'string' &&
      (typeof position.parentId === 'string' || position.parentId === undefined) &&
      typeof position.x === 'number' &&
      typeof position.y === 'number'
    );
  }

  /**
   * Resolves configured layout defaults into a complete placement settings object.
   *
   * @param workspace - Loaded workspace carrying optional Atlas layout policy.
   * @returns Fully specified deterministic layout settings.
   */
  private createLayoutSettings(workspace: WorkspaceSnapshot): LayoutSettings {
    const configuredLayout = workspace.configuration.layout;
    return new LayoutSettings(
      configuredLayout?.orientation ?? 'horizontal',
      configuredLayout?.rows ?? 6,
      configuredLayout?.horizontalGap ?? 80,
      configuredLayout?.verticalGap ?? 60,
      false
    );
  }

  /**
   * Converts semantic graph nodes and relationships into Cytoscape-compatible elements with package and directory compounds.
   *
   * @param workspace - Loaded package roots used to make hierarchy paths package-relative.
   * @param diagram - Scope graph to transform.
   * @returns Serializable Cytoscape-compatible graph document.
   */
  private createGraphDocument(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph
  ): Record<string, unknown> {
    const packageNames = [
      ...new Set(
        diagram.nodes.flatMap((node) => (node.packageName === undefined ? [] : [node.packageName]))
      )
    ].sort((left, right) => left.localeCompare(right));
    const packageNodes = packageNames.map((packageName) => ({
      data: {
        id: `package:${encodeURIComponent(packageName)}`,
        label: packageName,
        kind: 'package',
        compound: true
      }
    }));
    const directoryHierarchy = this.createDirectoryCompoundNodes(workspace, diagram.nodes);
    const declarationNodes = diagram.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        kind: node.kind,
        packageName: node.packageName,
        sourcePath: node.sourcePath,
        packageSourcePath: this.toPackageRootRelativeSourcePath(workspace, node),
        moduleNode: node.moduleNode,
        sourceLanguage: node.sourceLanguage,
        parent: directoryHierarchy.parentIdsByDeclarationNodeId.get(node.id)
      }
    }));
    const edges = diagram.relationships.map((relationship) => ({
      data: {
        id: relationship.id,
        source: relationship.sourceId,
        target: relationship.targetId,
        relationshipType: relationship.type
      }
    }));

    return {
      schemaVersion: 1,
      scope: diagram.scope,
      title: diagram.title,
      elements: {
        nodes: [...packageNodes, ...directoryHierarchy.nodes, ...declarationNodes],
        edges
      }
    };
  }

  /** Converts a graph source path to the owning package's root-relative policy path. */
  private toPackageRootRelativeSourcePath(
    workspace: WorkspaceSnapshot,
    node: DeclarationNode
  ): string | undefined {
    if (node.packageName === undefined || node.sourcePath === undefined) return undefined;
    const workspacePackage = workspace.packages.find(
      (candidate) => candidate.name === node.packageName
    );
    if (workspacePackage === undefined || workspacePackage.relativeRootPath === '.') {
      return node.sourcePath;
    }
    const prefix = `${workspacePackage.relativeRootPath}/`;
    return node.sourcePath.startsWith(prefix)
      ? node.sourcePath.slice(prefix.length)
      : node.sourcePath;
  }

  /**
   * Produces one nested compound element for every local declaration directory.
   *
   * @param workspace - Loaded package roots used to make hierarchy paths package-relative.
   * @param nodes - Diagram declarations whose source paths determine directory hierarchy.
   * @returns Sorted Cytoscape directory compound elements with stable package-scoped identifiers.
   */
  private createDirectoryCompoundNodes(
    workspace: WorkspaceSnapshot,
    nodes: readonly DeclarationNode[]
  ): {
    readonly nodes: readonly Record<string, unknown>[];
    readonly parentIdsByDeclarationNodeId: ReadonlyMap<string, string | undefined>;
  } {
    const directories = new Map<
      string,
      { readonly packageName: string; readonly path: string; readonly sourceLanguages: Set<string> }
    >();
    const directFileDirectoryIds = new Set<string>();
    const directoryIdByDeclarationNodeId = new Map<string, string | undefined>();
    for (const node of nodes) {
      if (node.packageName === undefined || node.sourcePath === undefined) {
        continue;
      }
      const segments = this.toPackageRelativeSourcePath(workspace, node)
        .split('/')
        .filter((segment) => segment.length > 0);
      segments.pop();
      const declarationDirectoryPath = segments.join('/');
      directoryIdByDeclarationNodeId.set(
        node.id,
        declarationDirectoryPath.length === 0
          ? `package:${encodeURIComponent(node.packageName)}`
          : this.toDirectoryCompoundId(node.packageName, declarationDirectoryPath)
      );
      if (declarationDirectoryPath.length > 0) {
        directFileDirectoryIds.add(
          this.toDirectoryCompoundId(node.packageName, declarationDirectoryPath)
        );
      }
      for (let depth = 1; depth <= segments.length; depth += 1) {
        const path = segments.slice(0, depth).join('/');
        const id = this.toDirectoryCompoundId(node.packageName, path);
        const directory = directories.get(id) ?? {
          packageName: node.packageName,
          path,
          sourceLanguages: new Set<string>()
        };
        directory.sourceLanguages.add(
          node.sourceLanguage === 'kotlin' || node.sourcePath.endsWith('.kt') ? 'kotlin' : 'unknown'
        );
        directories.set(id, directory);
      }
    }
    const childrenByDirectoryId = new Map<string, string[]>();
    for (const [id, directory] of directories) {
      const parentPath = directory.path.includes('/')
        ? directory.path.slice(0, directory.path.lastIndexOf('/'))
        : undefined;
      if (parentPath !== undefined) {
        const parentId = this.toDirectoryCompoundId(directory.packageName, parentPath);
        const children = childrenByDirectoryId.get(parentId) ?? [];
        children.push(id);
        childrenByDirectoryId.set(parentId, children);
      }
    }
    const isKotlinNamespace = (id: string): boolean => {
      const languages = directories.get(id)?.sourceLanguages;
      return languages?.size === 1 && languages.has('kotlin');
    };
    const compactedDirectoryIds = new Map<string, string>();
    const compactedLabels = new Map<string, string>();
    for (const [id, directory] of directories) {
      if (!isKotlinNamespace(id) || compactedDirectoryIds.has(id)) {
        continue;
      }
      const parentPath = directory.path.includes('/')
        ? directory.path.slice(0, directory.path.lastIndexOf('/'))
        : undefined;
      const parentId =
        parentPath === undefined
          ? undefined
          : this.toDirectoryCompoundId(directory.packageName, parentPath);
      if (
        parentId !== undefined &&
        isKotlinNamespace(parentId) &&
        (childrenByDirectoryId.get(parentId)?.length ?? 0) === 1 &&
        !directFileDirectoryIds.has(parentId)
      ) {
        continue;
      }
      const compactedSegments = [directory.path.split('/').at(-1) ?? directory.path];
      const compactedPathIds = [id];
      let currentId = id;
      while (
        (childrenByDirectoryId.get(currentId)?.length ?? 0) === 1 &&
        !directFileDirectoryIds.has(currentId)
      ) {
        const childId = childrenByDirectoryId.get(currentId)?.[0];
        if (childId === undefined || !isKotlinNamespace(childId)) {
          break;
        }
        const child = directories.get(childId);
        if (child === undefined) {
          break;
        }
        compactedSegments.push(child.path.split('/').at(-1) ?? child.path);
        currentId = childId;
        compactedPathIds.push(childId);
      }
      compactedPathIds.forEach((pathId) => compactedDirectoryIds.set(pathId, currentId));
      compactedLabels.set(currentId, compactedSegments.join('.'));
    }
    const parentIdsByDeclarationNodeId = new Map<string, string | undefined>();
    for (const node of nodes) {
      const directoryId = directoryIdByDeclarationNodeId.get(node.id);
      parentIdsByDeclarationNodeId.set(
        node.id,
        directoryId === undefined || directoryId.startsWith('package:')
          ? directoryId
          : (compactedDirectoryIds.get(directoryId) ?? directoryId)
      );
    }
    const compoundNodes = [...directories.entries()]
      .filter(
        ([id]) =>
          compactedDirectoryIds.get(id) === undefined || compactedDirectoryIds.get(id) === id
      )
      .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
      .map(([id, directory]) => {
        const parentPath = directory.path.includes('/')
          ? directory.path.slice(0, directory.path.lastIndexOf('/'))
          : undefined;
        const parentId =
          parentPath === undefined
            ? `package:${encodeURIComponent(directory.packageName)}`
            : this.toDirectoryCompoundId(directory.packageName, parentPath);
        const compactedParentId = compactedDirectoryIds.get(parentId) ?? parentId;
        return {
          data: {
            id,
            label: compactedLabels.get(id) ?? directory.path.split('/').at(-1),
            kind: 'directory',
            compound: true,
            parent:
              compactedParentId === id
                ? `package:${encodeURIComponent(directory.packageName)}`
                : compactedParentId
          }
        };
      });
    return { nodes: compoundNodes, parentIdsByDeclarationNodeId };
  }

  /**
   * Builds a package-scoped stable directory compound identifier from normalized source-path segments.
   *
   * @param packageName - Owning local package name.
   * @param directoryPath - Slash-normalized source directory path relative to the workspace.
   * @returns Stable encoded directory compound identifier.
   */
  private toDirectoryCompoundId(packageName: string, directoryPath: string): string {
    return `directory:${encodeURIComponent(packageName)}:${encodeURIComponent(directoryPath)}`;
  }

  /**
   * Removes the owning package's configured source-root prefix from a workspace-relative source path.
   *
   * @param workspace - Loaded package roots used to find the declaration's source root.
   * @param node - Local declaration with a workspace-relative source path.
   * @returns Path relative to the deepest matching package source root, or the original path when unavailable.
   */
  private toPackageRelativeSourcePath(workspace: WorkspaceSnapshot, node: DeclarationNode): string {
    if (node.packageName === undefined || node.sourcePath === undefined) {
      return '';
    }
    const workspacePackage = workspace.packages.find(
      (candidate) => candidate.name === node.packageName
    );
    if (workspacePackage === undefined) {
      return node.sourcePath;
    }
    const sourcePath = node.sourcePath;
    const sourceRoots = workspacePackage.sourceRootPaths
      .map((sourceRootPath) => relative(workspace.paths.workspaceRootPath, sourceRootPath))
      .map((sourceRootPath) => sourceRootPath.replaceAll(sep, '/'))
      .sort((left, right) => right.length - left.length);
    const sourceRoot = sourceRoots.find(
      (candidate) => sourcePath === candidate || sourcePath.startsWith(`${candidate}/`)
    );
    if (sourceRoot !== undefined) {
      return sourcePath.slice(sourceRoot.length).replace(/^\/+/, '');
    }
    const packageRoot = workspacePackage.relativeRootPath;
    return packageRoot === '.' || !sourcePath.startsWith(`${packageRoot}/`)
      ? sourcePath
      : sourcePath.slice(packageRoot.length + 1);
  }

  /**
   * Creates a self-contained static viewer shell that embeds graph data and navigation.
   *
   * @param workspace - Loaded workspace used to create package-relative graph hierarchy data.
   * @param diagram - Scope graph embedded by the page.
   * @param navigation - Cross-scope navigation metadata.
   * @returns Complete HTML viewer document.
   */
  private createViewerPage(
    workspace: WorkspaceSnapshot,
    diagram: DiagramGraph,
    navigation: readonly DiagramNavigationItem[],
    isArtifactRoot = false
  ): string {
    const embeddedGraph = this.createScriptJson({
      ...this.createGraphDocument(workspace, diagram),
      layoutPath: isArtifactRoot
        ? `${this.toScopeDirectoryName(diagram.scope)}/layout.json`
        : 'layout.json',
      pagePaths: navigation.map((item) => `/${item.graphPath}`)
    });

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(diagram.title)}</title></head>
<body>
<div class="shell" id="shell"><nav class="navigation" aria-label="Architecture pages"><div class="navigation-header"><button class="nav-toggle" id="atlas-nav-toggle" type="button" title="Toggle page navigation">&#9776;</button><div class="navigation-title">Architecture</div></div><div class="navigation-links">${this.createNavigationLinks(navigation, `${this.toScopeDirectoryName(diagram.scope)}/index.html`)}</div></nav>
<main class="workspace"><div class="toolbar" aria-label="Graph controls"><div class="toolbar-row toolbar-row-primary"><input class="search-input" id="atlas-search" type="search" autocomplete="off" placeholder="Search nodes"><button class="toolbar-button active" id="atlas-filter-both" type="button">Both</button><button class="toolbar-button" id="atlas-filter-inbound" type="button">Inbound</button><button class="toolbar-button" id="atlas-filter-outbound" type="button">Outbound</button><button class="toolbar-button" id="atlas-clear-selection" type="button">None</button><span class="toolbar-separator">|</span><button class="toolbar-button active" id="atlas-externals" type="button">External</button><button class="toolbar-button" id="atlas-hidden-connections" type="button">Hidden</button><span class="toolbar-separator">|</span><button class="toolbar-button" id="atlas-create-folder" type="button" disabled>Create Diagram</button><button class="toolbar-button" id="atlas-export-png" type="button">Export Image</button><button class="toolbar-button" id="atlas-export-all" type="button">Export All</button><button class="toolbar-button theme-toggle" id="atlas-dark-mode" type="button">Dark Mode</button><span class="graph-legend"><span><i class="legend-swatch legend-class"></i>Class</span><span><i class="legend-swatch legend-interface"></i>Interface</span><span><i class="legend-swatch legend-other"></i>Other</span><span><i class="legend-edge"></i>Reference</span><span><i class="legend-edge"></i>Implements/extends</span></span></div>
<div class="toolbar-row toolbar-row-secondary"><button class="toolbar-button" id="atlas-fit" type="button">Fit</button><span class="toolbar-separator">|</span><button class="toolbar-button" id="atlas-collapse-group" type="button" disabled>Collapse</button><button class="toolbar-button" id="atlas-hide-selected" type="button" disabled>Hide</button><button class="toolbar-button" id="atlas-split-externals" type="button" disabled>Split</button><span class="toolbar-separator">|</span><button class="toolbar-button" id="atlas-auto-layout" type="button">Auto layout</button><button class="toolbar-button" id="atlas-orientation" type="button" aria-pressed="false">Vertical</button><label class="layout-control">Layout Rows <input id="atlas-rows" type="range" min="3" max="8" value="5"><output id="atlas-rows-value">5</output></label><label class="layout-control">Horizontal Gap <input id="atlas-horizontal-gap" type="range" min="80" max="200" step="5" value="120"><output id="atlas-horizontal-gap-value">120</output></label><label class="layout-control">Vertical Gap <input id="atlas-vertical-gap" type="range" min="80" max="200" step="5" value="120"><output id="atlas-vertical-gap-value">120</output></label><span class="toolbar-separator">|</span><button class="toolbar-button" id="atlas-snap" type="button" aria-pressed="false">Snap</button><label class="layout-control">Snap grid <input id="atlas-snap-grid" type="range" min="5" max="100" step="5" value="20"><output id="atlas-snap-grid-value">20</output></label><div class="exclusion-control"><button class="toolbar-button" id="atlas-excluded-toggle" type="button" aria-expanded="false">Excluded</button><div class="exclusion-menu" id="atlas-excluded-menu" hidden></div></div></div></div>
<div id="cy" role="img" aria-label="Interactive declaration relationship diagram"></div><div class="status-bar"><span class="layout-status" id="atlas-selection">Select a node to inspect direct dependencies.</span></div><section class="atlas-accessibility"><div id="atlas-packages"></div><ul id="atlas-nodes"></ul><ul id="atlas-relationships"></ul><input id="atlas-folder-package" type="hidden"><input id="atlas-folder-path" type="hidden"></section></main></div>
<script id="atlas-graph" type="application/json">${embeddedGraph}</script>
<style>${this.createLegacyViewerStyles()}</style><style>.navigation{overflow-x:hidden;overflow-y:auto}</style>
<script src="${this.createViewerAssetPath(diagram, isArtifactRoot)}"></script>
<script>${this.createCytoscapeViewerScript()}</script>
</body></html>\n`;
  }

  /**
   * Creates a path from a generated viewer page to the artifact-root Cytoscape asset.
   *
   * @param diagram - Scope whose directory depth determines the relative path.
   * @param isArtifactRoot - Whether the page itself is the artifact-root index.
   * @returns Browser-relative path to the copied Cytoscape runtime.
   */
  private createViewerAssetPath(diagram: DiagramGraph, isArtifactRoot: boolean): string {
    if (isArtifactRoot) {
      return 'assets/cytoscape.min.js';
    }
    const scopeDepth = this.toScopeDirectoryName(diagram.scope).split('/').length;
    return `${'../'.repeat(scopeDepth)}assets/cytoscape.min.js`;
  }

  /**
   * Returns the legacy viewer stylesheet for the shared Cytoscape document structure.
   *
   * @returns CSS rules that preserve the prior viewer's layout, spacing, colors, and control states.
   */
  private createLegacyViewerStyles(): string {
    return `html,body{height:100%;margin:0}body{background:#fff;color:#111827;font-family:Arial,sans-serif;overflow:hidden}body.dark-mode{background:#0f172a;color:#e5e7eb}.shell{display:grid;grid-template-columns:280px 1fr;height:100%;min-width:0;transition:grid-template-columns 160ms ease}.shell.nav-collapsed{grid-template-columns:44px 1fr}.navigation{background:#f8fafc;border-right:1px solid #d1d5db;min-width:0;overflow:hidden}.navigation-header{align-items:center;display:flex;gap:8px;height:44px;padding:0 8px}.nav-toggle{align-items:center;background:#fff;border:1px solid #cbd5e1;border-radius:6px;color:#111827;cursor:pointer;display:inline-flex;height:28px;justify-content:center;width:28px}.navigation-title{font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.navigation-links,.navigation-children{display:flex;flex-direction:column;gap:2px;padding:0 8px 12px}.navigation-children{padding:0 0 0 16px}.nav-collapsed .navigation-title,.nav-collapsed .navigation-links{display:none}.navigation-group-title{color:#0f172a;font-size:13px;font-weight:700;line-height:1.3;padding:8px 10px 4px}.navigation-link{border-radius:6px;color:#334155;display:block;font-size:13px;line-height:1.3;padding:8px 10px;text-decoration:none}.navigation-link:hover{background:#e2e8f0;color:#0f172a}.navigation-link.current{background:#dbeafe;color:#1d4ed8;font-weight:700}.workspace{display:grid;grid-template-rows:auto 1fr auto;min-height:0;min-width:0}.toolbar{border-bottom:1px solid #d1d5db;display:grid;gap:6px;padding:6px 10px}.toolbar-row{align-items:center;display:flex;flex-wrap:wrap;gap:8px;min-width:0}.toolbar-row-primary .theme-toggle{margin-left:auto}.search-input{border:1px solid #cbd5e1;border-radius:6px;font-size:13px;height:30px;min-width:220px;padding:0 10px}.toolbar-button{background:#fff;border:1px solid #cbd5e1;border-radius:6px;color:#111827;cursor:pointer;font-size:13px;height:30px;padding:0 10px}.toolbar-button.active{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.toolbar-button:disabled{cursor:not-allowed;opacity:.45}.toolbar-separator{color:#94a3b8;font-size:18px;line-height:30px}.graph-legend{color:#475569;display:inline-flex;font-size:12px;gap:8px;margin-left:8px}.graph-legend-item{align-items:center;display:inline-flex;gap:4px}.legend-swatch{border-radius:50%;display:inline-block;height:10px;width:10px}.legend-class{background:#3b82f6}.legend-interface{background:#14b8a6}.legend-other{background:#f59e0b}.legend-edge{border-top:2px solid #94a3b8;display:inline-block;width:18px}.legend-inheritance{border-top-style:dashed}.layout-control{align-items:center;display:inline-flex;font-size:12px;gap:6px;white-space:nowrap}.layout-control input{accent-color:#2563eb;width:96px}.layout-control output{color:#475569;font-variant-numeric:tabular-nums;min-width:24px}.exclusion-control{margin-left:auto;position:relative}.exclusion-menu{background:#fff;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 8px 20px rgba(15,23,42,.18);display:grid;gap:8px;padding:10px;position:absolute;right:0;top:36px;width:300px;z-index:2}.exclusion-menu[hidden]{display:none}.exclusion-section{display:grid;gap:6px}.exclusion-section+.exclusion-section{border-top:1px solid #d1d5db;padding-top:8px}.exclusion-label{color:#475569;font-size:11px;font-weight:700;text-transform:uppercase}.exclusion-rule{align-items:center;display:flex;font-size:12px;gap:6px;overflow-wrap:anywhere}.exclusion-add{display:flex;gap:6px}.exclusion-add input{border:1px solid #cbd5e1;border-radius:4px;flex:1;font-size:12px;height:26px;min-width:0;padding:0 6px}.exclusion-add button{min-width:28px;padding:0}.status-bar{align-items:center;border-top:1px solid #d1d5db;display:flex;min-height:28px;padding:0 10px}.layout-status{color:#64748b;font-size:12px;min-width:142px}.layout-status.error{color:#b91c1c}.dark-mode .navigation{background:#111827;border-right-color:#334155}.dark-mode .nav-toggle,.dark-mode .toolbar-button,.dark-mode .search-input,.dark-mode .exclusion-menu,.dark-mode .exclusion-add input{background:#1f2937;border-color:#475569;color:#e5e7eb}.dark-mode .toolbar-separator,.dark-mode .layout-control output{color:#94a3b8}.dark-mode .graph-legend{color:#cbd5e1}.dark-mode .navigation-link{color:#cbd5e1}.dark-mode .navigation-group-title{color:#e5e7eb}.dark-mode .navigation-link:hover{background:#334155;color:#f8fafc}.dark-mode .navigation-link.current,.dark-mode .toolbar-button.active{background:#6d28d9;border-color:#6d28d9;color:#fff}.dark-mode .toolbar{background:#0f172a;border-bottom-color:#334155}.dark-mode .layout-status,.dark-mode .exclusion-label{color:#94a3b8}.dark-mode .layout-status.error{color:#fca5a5}#cy{background:#fff;height:100%;min-height:0;min-width:0;width:100%}.dark-mode #cy{background:#0f172a}.atlas-accessibility{display:none}`;
  }

  /**
   * Produces the legacy Cytoscape interaction surface for generated architecture diagrams.
   *
   * @returns Executable browser script that keeps legacy viewer controls and Atlas persistence endpoints aligned.
   */
  private createCytoscapeViewerScript(): string {
    void this.createViewerScript;
    void this.createLayoutPersistenceScript;

    return `(() => {
${LegacyAutoLayoutScript.render()}
const graph = JSON.parse(document.getElementById('atlas-graph').textContent);
const status = document.getElementById('atlas-selection');
const shell = document.getElementById('shell');
const search = document.getElementById('atlas-search');
const externals = document.getElementById('atlas-externals');
const darkMode = document.getElementById('atlas-dark-mode');
const snap = document.getElementById('atlas-snap');
const orientation = document.getElementById('atlas-orientation');
const hiddenConnections = document.getElementById('atlas-hidden-connections');
const excludedToggle = document.getElementById('atlas-excluded-toggle');
const excludedMenu = document.getElementById('atlas-excluded-menu');
const collapseGroup = document.getElementById('atlas-collapse-group');
const hideSelected = document.getElementById('atlas-hide-selected');
const splitExternals = document.getElementById('atlas-split-externals');
const createFolderDiagram = document.getElementById('atlas-create-folder');
const filterButtons = { both: document.getElementById('atlas-filter-both'), inbound: document.getElementById('atlas-filter-inbound'), outbound: document.getElementById('atlas-filter-outbound'), none: document.getElementById('atlas-clear-selection') };
let relationshipFilter = 'both';
let externalNodesVisible = true;
let snapEnabled = false;
let verticalLayoutEnabled = false;
let showHiddenConnections = false;
const hiddenRelationshipIds = new Set();
const collapsedGroupIds = new Set();
const cy = cytoscape({ container: document.getElementById('cy'), userZoomingEnabled: false, elements: graph.elements, style: [
  { selector: 'node', style: { label: 'data(label)', shape: 'round-rectangle', width: (node) => Math.min(320, Math.max(140, 48 + Math.min(String(node.data('label') ?? '').length, 34) * 8)), height: (node) => node.data('kind') === 'module' || node.data('kind') === 'external' ? 48 : 56, 'background-color': '#f59e0b', color: '#ffffff', 'font-size': 12, 'font-weight': 600, 'text-wrap': 'wrap', 'text-max-width': 280, 'text-valign': 'center', 'text-halign': 'center' } },
  { selector: ':parent', style: { label: 'data(label)', 'background-color': '#f8fafc', 'border-color': '#64748b', 'border-width': 1, padding: 24, color: '#334155', 'font-size': 14, 'font-weight': 600, 'text-wrap': 'wrap', 'text-max-width': 260, 'text-valign': 'top', 'text-halign': 'center' } },
  { selector: 'node[kind = "class"]', style: { 'background-color': '#3b82f6' } },
  { selector: 'node[kind = "interface"]', style: { 'background-color': '#14b8a6' } },
  { selector: 'node[kind = "external"]', style: { 'background-color': '#6b7280' } },
  { selector: 'edge', style: { width: 2, 'line-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'curve-style': 'bezier' } },
  { selector: 'edge[relationshipType = "inheritance"]', style: { 'line-style': 'dashed' } },
  { selector: '.faded', style: { opacity: 0.12 } },
  { selector: '.hidden-by-filter', style: { display: 'none' } },
  { selector: '.hidden-connection', style: { opacity: 0.22, 'line-style': 'dotted' } },
  { selector: 'node.collapsed-proxy', style: { shape: 'round-rectangle', width: 160, height: 64, 'background-color': '#f59e0b', 'border-color': '#b45309', 'border-width': 2, color: '#111827', 'text-valign': 'center', 'text-halign': 'center' } },
  { selector: 'edge.collapsed-proxy', style: { 'line-style': 'dashed' } },
  { selector: '.search-match', style: { 'border-color': '#f59e0b', 'border-width': 4 } },
  { selector: 'edge.inbound', style: { 'line-color': '#16a34a', 'target-arrow-color': '#16a34a', width: 4 } },
  { selector: 'edge.outbound', style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb', width: 4 } }
] });
function normalizedWheelDelta(event) { return event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 800 : event.deltaY; }
cy.container().addEventListener('wheel', (event) => { event.preventDefault(); const deltaY = normalizedWheelDelta(event); if (deltaY === 0) { return; } const zoom = cy.zoom(); const sensitivity = Math.min(1, Math.max(0.15, 0.5 / zoom)); cy.zoom({ level: zoom * Math.pow(10, -deltaY * 0.001 * sensitivity), renderedPosition: { x: event.clientX, y: event.clientY } }); }, { passive: false });
function saveLayout() { const positions = cy.nodes().filter(':childless').map((node) => ({ nodeId: node.id(), parentId: node.data('parent'), x: node.position('x'), y: node.position('y') })); void fetch('/api/layout?scope=' + encodeURIComponent(graph.scope), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, positions, hiddenRelationshipIds: [...hiddenRelationshipIds] }) }); }
function updateHiddenConnections() { cy.edges().removeClass('hidden-connection').filter((edge) => hiddenRelationshipIds.has(edge.id())).forEach((edge) => { edge.toggleClass('hidden-by-filter', !showHiddenConnections); edge.toggleClass('hidden-connection', showHiddenConnections); }); hiddenConnections.classList.toggle('active', showHiddenConnections); }
function collapsedNodeId(groupId) { return 'collapsed:' + groupId; }
function isCollapsedProxy(node) { return typeof node.data('collapsedGroupId') === 'string'; }
function collapsedEndpointId(node) { for (const groupId of collapsedGroupIds) { const group = cy.$id(groupId); if (!group.empty() && (node.same(group) || node.ancestors().anySame(group))) { return collapsedNodeId(groupId); } } return node.id(); }
function synchronizeCollapsedGroups() { const positions = new Map(); cy.nodes('.collapsed-proxy').forEach((node) => positions.set(node.data('collapsedGroupId'), node.position())); cy.elements('.collapsed-proxy').remove(); [...collapsedGroupIds].forEach((groupId) => { const group = cy.$id(groupId); if (group.empty()) { collapsedGroupIds.delete(groupId); return; } cy.add({ group: 'nodes', classes: 'collapsed-proxy', data: { id: collapsedNodeId(groupId), label: group.data('label'), collapsedGroupId: groupId }, position: positions.get(groupId) || group.position() }); }); cy.edges().not('.collapsed-proxy').forEach((edge) => { const sourceId = collapsedEndpointId(edge.source()); const targetId = collapsedEndpointId(edge.target()); if (sourceId === targetId || (sourceId === edge.source().id() && targetId === edge.target().id())) { return; } cy.add({ group: 'edges', classes: 'collapsed-proxy', data: { id: 'collapsed-edge:' + edge.id() + ':' + sourceId + '->' + targetId, source: sourceId, target: targetId } }); }); }
function hideCollapsedGroups() { collapsedGroupIds.forEach((groupId) => { const group = cy.$id(groupId); if (!group.empty()) { group.union(group.descendants()).addClass('hidden-by-filter'); } }); }
function hideEmptyGroups() { cy.nodes(':parent').sort((left, right) => right.ancestors().length - left.ancestors().length).forEach((group) => { if (group.children().filter((child) => !child.hasClass('hidden-by-filter')).empty()) { group.addClass('hidden-by-filter'); } }); }
const autoLayout = new DiagramAutoLayout(cy);
function runAutoLayout() { autoLayout.configure(Number(document.getElementById('atlas-rows').value) || 5, Number(document.getElementById('atlas-horizontal-gap').value) || 120, Number(document.getElementById('atlas-vertical-gap').value) || 120, verticalLayoutEnabled); const selected = cy.$(':selected').filter(':node'); if (selected.empty()) { autoLayout.layout(); } else { autoLayout.layoutGroup(selected); } cy.resize(); cy.fit(undefined, 36); }
function setStatus(text) { status.textContent = text; }
function focus(selected) { cy.elements().removeClass('faded inbound outbound'); const selectedEdge = cy.$(':selected').filter(':edge'); const hasNodeSelection = selected && !selected.empty(); const proxySelected = hasNodeSelection && isCollapsedProxy(selected); hideSelected.disabled = !hasNodeSelection && selectedEdge.empty(); collapseGroup.disabled = !hasNodeSelection || (!proxySelected && selected.children().empty()); collapseGroup.textContent = proxySelected ? 'Expand' : 'Collapse'; splitExternals.disabled = !hasNodeSelection || proxySelected || selected.data('kind') !== 'external' || graph.scope !== 'landscape'; createFolderDiagram.disabled = !hasNodeSelection || proxySelected || typeof selected.data('packageName') !== 'string' || typeof selected.data('packageSourcePath') !== 'string'; if (!hasNodeSelection) { setStatus(selectedEdge.empty() ? 'Select a node to inspect direct dependencies.' : 'Select Hide to conceal this connection.'); return; } const inbound = selected.incomers('edge'); const outbound = selected.outgoers('edge'); const shown = relationshipFilter === 'none' ? cy.collection() : relationshipFilter === 'inbound' ? inbound : relationshipFilter === 'outbound' ? outbound : inbound.union(outbound); const selectedContents = selected.union(selected.descendants()); cy.elements().difference(selectedContents.union(shown).union(shown.connectedNodes())).addClass('faded'); if (relationshipFilter === 'none') { cy.edges().addClass('hidden-by-filter'); } else { inbound.addClass('inbound'); outbound.addClass('outbound'); } setStatus(selected.data('label') + ': ' + outbound.length + ' outbound, ' + inbound.length + ' inbound direct relationship(s).'); }
function selectedNodesToKeepVisible() { const selected = cy.$(':selected').filter(':node'); if (selected.empty()) { return cy.collection(); } const inbound = selected.incomers('edge'); const outbound = selected.outgoers('edge'); const shown = relationshipFilter === 'none' ? cy.collection() : relationshipFilter === 'inbound' ? inbound : relationshipFilter === 'outbound' ? outbound : inbound.union(outbound); const relatedNodes = shown.connectedNodes(); return selected.union(selected.descendants()).union(relatedNodes).union(selected.ancestors()).union(relatedNodes.ancestors()); }
function updateFilters() { const query = search.value.trim().toLocaleLowerCase(); synchronizeCollapsedGroups(); cy.elements().removeClass('hidden-by-filter search-match'); hideCollapsedGroups(); cy.nodes('[kind = "external"]').toggleClass('hidden-by-filter', !externalNodesVisible); if (query) { const matches = cy.nodes().filter((node) => String(node.data('label')).toLocaleLowerCase().includes(query)); matches.addClass('search-match'); cy.nodes().difference(matches).addClass('hidden-by-filter'); } if (relationshipFilter === 'none') { cy.edges().not('.collapsed-proxy').addClass('hidden-by-filter'); } updateHiddenConnections(); hideEmptyGroups(); selectedNodesToKeepVisible().removeClass('hidden-by-filter'); focus(cy.$(':selected').filter(':node')); }
function updateTheme() { const dark = darkMode.classList.contains('active'); const foreground = dark ? '#e5e7eb' : '#111827'; document.body.classList.toggle('dark-mode', dark); cy.style().selector('node').style('color', foreground).selector(':parent').style('background-color', dark ? '#111827' : '#f8fafc').style('color', foreground).selector('node.collapsed-proxy').style('color', foreground).update(); localStorage.setItem('atlas-dark-mode', String(dark)); }
function renderExclusionSection(title, values, removeType, addType) { const section = document.createElement('section'); section.className = 'exclusion-section'; const label = document.createElement('div'); label.className = 'exclusion-label'; label.textContent = title; section.append(label); values.forEach((value) => { const rule = document.createElement('label'); rule.className = 'exclusion-rule'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = true; checkbox.addEventListener('change', () => { if (!checkbox.checked) { void fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: removeType, value }) }).then(() => window.location.reload()); } }); const text = document.createElement('span'); text.textContent = value; rule.append(checkbox, text); section.append(rule); }); const add = document.createElement('div'); add.className = 'exclusion-add'; const input = document.createElement('input'); input.placeholder = 'Node name or glob'; const button = document.createElement('button'); button.className = 'toolbar-button'; button.type = 'button'; button.textContent = '+'; const submit = () => { const value = input.value.trim(); if (value) { void fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: addType, value }) }).then(() => window.location.reload()); } }; button.addEventListener('click', submit); input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }); add.append(input, button); section.append(add); return section; }
function loadExclusions() { return fetch('/api/config').then((response) => response.ok ? response.json() : { externalDependencies: [], sourceGlobs: [] }).then((summary) => { excludedMenu.replaceChildren(renderExclusionSection('All packages', Array.isArray(summary.sourceGlobs) ? summary.sourceGlobs : [], 'remove-source-exclusion', 'hide-source'), renderExclusionSection(graph.title, Array.isArray(summary.externalDependencies) ? summary.externalDependencies : [], 'remove-external-exclusion', 'hide-external')); }).catch(() => { excludedMenu.textContent = 'Exclusions unavailable'; status.classList.add('error'); }); }
function activateFilter(mode) { relationshipFilter = mode; Object.entries(filterButtons).forEach(([key, button]) => button.classList.toggle('active', key === mode)); updateFilters(); }
function restoreLayout() { return fetch(typeof graph.layoutPath === 'string' ? graph.layoutPath : 'layout.json').then((response) => response.ok ? response.json() : undefined).then((layout) => { if (!layout || !Array.isArray(layout.positions)) { runAutoLayout(); return; } if (Array.isArray(layout.hiddenRelationshipIds)) { layout.hiddenRelationshipIds.forEach((id) => hiddenRelationshipIds.add(id)); updateHiddenConnections(); } let applied = 0; layout.positions.forEach((position) => { const node = cy.$id(position.nodeId); if (!node.empty()) { node.position({ x: position.x, y: position.y }); applied += 1; } }); const bounds = cy.nodes().filter(':childless').boundingBox(); if (applied === 0 || bounds.w > 10000 || bounds.h > 10000) { runAutoLayout(); return; } cy.resize(); cy.fit(undefined, 36); }).catch(runAutoLayout); }
document.getElementById('atlas-nav-toggle').addEventListener('click', () => shell.classList.toggle('nav-collapsed'));
document.getElementById('atlas-fit').addEventListener('click', () => cy.fit(undefined, 36));
document.getElementById('atlas-auto-layout').addEventListener('click', () => { runAutoLayout(); saveLayout(); });
function exportImage() { return layoutReady.then(() => { const image = cy.png({ bg: darkMode.classList.contains('active') ? '#0f172a' : '#ffffff', full: false, output: 'blob', scale: 1 }); return fetch('/api/png?scope=' + encodeURIComponent(graph.scope), { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image }).then((response) => { if (!response.ok) { throw new Error('Image export failed.'); } return true; }); }); }
function exportAllImages() { const pagePaths = Array.isArray(graph.pagePaths) ? graph.pagePaths : []; return pagePaths.reduce((chain, pagePath, index) => chain.then(() => new Promise((resolve, reject) => { setStatus('Exporting image ' + (index + 1) + ' of ' + pagePaths.length); const frame = document.createElement('iframe'); frame.style.cssText = 'position:fixed;left:-10000px;width:1280px;height:720px;border:0'; const exportWhenReady = (attempts) => { const exportPageImage = frame.contentWindow && frame.contentWindow.exportDiagramImage; if (typeof exportPageImage === 'function') { Promise.resolve(exportPageImage()).then(resolve, reject).finally(() => frame.remove()); return; } if (attempts === 0) { frame.remove(); reject(new Error('Diagram image exporter was unavailable.')); return; } window.setTimeout(() => exportWhenReady(attempts - 1), 100); }; frame.addEventListener('load', () => exportWhenReady(100), { once: true }); frame.addEventListener('error', () => { frame.remove(); reject(new Error('Diagram page failed to load.')); }, { once: true }); frame.src = pagePath; document.body.append(frame); })), Promise.resolve()).then(() => { setStatus('All images exported: ' + pagePaths.length); }).catch(() => { status.classList.add('error'); setStatus('Export all failed'); }); }
window.exportDiagramImage = exportImage;
document.getElementById('atlas-export-png').addEventListener('click', () => { void exportImage(); });
document.getElementById('atlas-export-all').addEventListener('click', () => { void exportAllImages(); });
hideSelected.addEventListener('click', () => { const edge = cy.$(':selected').filter(':edge'); if (!edge.empty()) { hiddenRelationshipIds.add(edge.id()); edge.unselect(); updateHiddenConnections(); saveLayout(); setStatus('Layout saved with hidden connection.'); return; } const node = cy.$(':selected').filter(':node'); if (node.empty()) { return; } const action = node.data('kind') === 'external' ? { type: 'hide-external', value: node.data('label') } : { type: 'hide-source', value: node.data('sourcePath') }; void fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) }).then((response) => { if (response.status === 204) { window.location.reload(); } }); });
splitExternals.addEventListener('click', () => { if (graph.scope !== 'landscape') { return; } void fetch('/api/config').then((response) => response.ok ? response.json() : undefined).then((summary) => fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'set-external-splitting', enabled: !summary?.splitExternalDependenciesByImporter }) })).then((response) => { if (response.status === 204) { window.location.reload(); } }); });
createFolderDiagram.addEventListener('click', () => { const node = cy.$(':selected').filter(':node'); const packageName = node.data('packageName'); const sourcePath = node.data('packageSourcePath'); if (typeof packageName !== 'string' || typeof sourcePath !== 'string') { return; } const path = sourcePath.split('/').slice(0, -1).join('/'); if (!path) { return; } void fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'create-folder-diagram', packageName, path }) }).then((response) => { if (response.status === 204) { window.location.reload(); } }); });
externals.addEventListener('click', () => { externalNodesVisible = !externalNodesVisible; externals.classList.toggle('active', externalNodesVisible); updateFilters(); });
hiddenConnections.addEventListener('click', () => { showHiddenConnections = !showHiddenConnections; updateHiddenConnections(); });
excludedToggle.addEventListener('click', () => { const hidden = excludedMenu.hidden; excludedMenu.hidden = !hidden; excludedToggle.setAttribute('aria-expanded', String(hidden)); if (hidden) { void loadExclusions(); } });
darkMode.addEventListener('click', () => { darkMode.classList.toggle('active'); updateTheme(); });
orientation.addEventListener('click', () => { verticalLayoutEnabled = !verticalLayoutEnabled; orientation.classList.toggle('active', verticalLayoutEnabled); orientation.setAttribute('aria-pressed', String(verticalLayoutEnabled)); });
snap.addEventListener('click', () => { snapEnabled = !snapEnabled; snap.classList.toggle('active', snapEnabled); snap.setAttribute('aria-pressed', String(snapEnabled)); });
collapseGroup.addEventListener('click', () => { const node = cy.$(':selected').filter(':node'); if (node.empty()) { return; } if (isCollapsedProxy(node)) { collapsedGroupIds.delete(node.data('collapsedGroupId')); } else if (!node.children().empty()) { collapsedGroupIds.add(node.id()); } else { return; } node.unselect(); updateFilters(); cy.fit(undefined, 36); });
Object.entries(filterButtons).forEach(([mode, button]) => button.addEventListener('click', () => activateFilter(mode)));
['atlas-rows', 'atlas-horizontal-gap', 'atlas-vertical-gap', 'atlas-snap-grid'].forEach((id) => { const input = document.getElementById(id); const output = document.getElementById(id + '-value'); input.addEventListener('input', () => { output.textContent = input.value; }); });
search.addEventListener('input', updateFilters);
cy.on('select unselect', () => focus(cy.$(':selected').filter(':node'))); cy.on('dragfree', 'node', () => { if (snapEnabled) { const grid = Number(document.getElementById('atlas-snap-grid').value) || 20; const selected = cy.$(':selected').filter(':node'); const position = selected.position(); selected.position({ x: Math.round(position.x / grid) * grid, y: Math.round(position.y / grid) * grid }); } saveLayout(); });
darkMode.classList.toggle('active', localStorage.getItem('atlas-dark-mode') === 'true'); updateTheme(); const layoutReady = restoreLayout();
})();`;
  }

  /**
   * Serializes embedded graph data safely for an HTML raw-text script element.
   *
   * @param value - Serializable graph document value.
   * @returns JSON text that cannot prematurely close its containing script element.
   */
  private createScriptJson(value: unknown): string {
    return this.serialize(value)
      .replaceAll('<', '\\u003c')
      .replaceAll('>', '\\u003e')
      .replaceAll('&', '\\u0026');
  }

  /**
   * Produces an isolated browser overlay that maps persisted model coordinates onto the lightweight SVG renderer.
   *
   * @returns Executable browser script for layout hydration and drag autosave.
   */
  private createLayoutPersistenceScript(): string {
    return `(() => {
const graph = JSON.parse(document.getElementById('atlas-graph').textContent);
const canvas = document.getElementById('atlas-canvas');
const leaves = graph.elements.nodes.filter((entry) => entry.data.compound !== true);
const layoutPositions = new Map();
let drag;
function nodeForGroup(group, usedIds) { const label = group.getAttribute('aria-label'); return leaves.find((entry) => entry.data.label === label && !usedIds.has(entry.data.id)); }
function groupsByNode() { const result = new Map(); const usedIds = new Set(); canvas.querySelectorAll('g[aria-label]').forEach((group) => { const node = nodeForGroup(group, usedIds); if (!node) { return; } usedIds.add(node.data.id); group.dataset.atlasNodeId = node.data.id; result.set(node.data.id, group); }); return result; }
function applyLayout() { const groups = groupsByNode(); groups.forEach((group, nodeId) => { const position = layoutPositions.get(nodeId); if (!position) { return; } const rect = group.querySelector('rect'); const text = group.querySelector('text'); if (!rect || !text) { return; } rect.setAttribute('x', String(position.x - 65)); rect.setAttribute('y', String(position.y - 28)); text.setAttribute('x', String(position.x - 57)); text.setAttribute('y', String(position.y + 3)); }); const centers = new Map(); groups.forEach((group, nodeId) => { const rect = group.querySelector('rect'); if (rect) { centers.set(nodeId, { x: Number(rect.getAttribute('x')) + 65, y: Number(rect.getAttribute('y')) + 28 }); } }); canvas.querySelectorAll('line').forEach((line) => { const source = [...centers.values()].find((point) => Number(line.getAttribute('x1')) === point.x && Number(line.getAttribute('y1')) === point.y); const target = [...centers.values()].find((point) => Number(line.getAttribute('x2')) === point.x && Number(line.getAttribute('y2')) === point.y); if (source) { line.setAttribute('x1', String(source.x)); line.setAttribute('y1', String(source.y)); } if (target) { line.setAttribute('x2', String(target.x)); line.setAttribute('y2', String(target.y)); } }); }
function fitCanvas() { const rectangles = [...canvas.querySelectorAll('rect')]; if (rectangles.length === 0) { return; } const left = Math.min(...rectangles.map((rect) => Number(rect.getAttribute('x')))); const top = Math.min(...rectangles.map((rect) => Number(rect.getAttribute('y')))); const right = Math.max(...rectangles.map((rect) => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')))); const bottom = Math.max(...rectangles.map((rect) => Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')))); canvas.setAttribute('viewBox', [left - 80, top - 80, Math.max(320, right - left + 160), Math.max(240, bottom - top + 160)].join(' ')); }
function saveLayout() { const groups = groupsByNode(); groups.forEach((group, nodeId) => { const rect = group.querySelector('rect'); const node = leaves.find((entry) => entry.data.id === nodeId); if (!rect || !node) { return; } layoutPositions.set(nodeId, { parentId: node.data.parent, x: Number(rect.getAttribute('x')) + 65, y: Number(rect.getAttribute('y')) + 28 }); }); const positions = [...layoutPositions.entries()].map(([nodeId, position]) => ({ nodeId, parentId: position.parentId, x: position.x, y: position.y })); void fetch('/api/layout?scope=' + encodeURIComponent(graph.scope), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, positions, hiddenRelationshipIds: [] }) }); }
function canvasPoint(event) { const bounds = canvas.getBoundingClientRect(); const viewBox = canvas.viewBox.baseVal; return { x: viewBox.x + (event.clientX - bounds.left) * viewBox.width / bounds.width, y: viewBox.y + (event.clientY - bounds.top) * viewBox.height / bounds.height }; }
canvas.addEventListener('pointerdown', (event) => { const group = event.target.closest('g[aria-label]'); if (!group || !group.dataset.atlasNodeId) { return; } const rect = group.querySelector('rect'); if (!rect) { return; } const point = canvasPoint(event); drag = { nodeId: group.dataset.atlasNodeId, offsetX: point.x - Number(rect.getAttribute('x')), offsetY: point.y - Number(rect.getAttribute('y')) }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => { if (!drag) { return; } const point = canvasPoint(event); const node = leaves.find((entry) => entry.data.id === drag.nodeId); if (!node) { return; } const x = point.x - drag.offsetX + 65; const y = point.y - drag.offsetY + 28; const snap = document.getElementById('atlas-snap').checked; layoutPositions.set(drag.nodeId, { parentId: node.data.parent, x: snap ? Math.round(x / 20) * 20 : x, y: snap ? Math.round(y / 20) * 20 : y }); applyLayout(); });
canvas.addEventListener('pointerup', (event) => { if (!drag) { return; } drag = undefined; canvas.releasePointerCapture(event.pointerId); saveLayout(); window.setTimeout(applyLayout, 0); });
function loadPersistedLayout() { return fetch('layout.json').then((response) => response.ok ? response.json() : undefined).then((layout) => { if (!layout || !Array.isArray(layout.positions)) { return; } layoutPositions.clear(); layout.positions.forEach((position) => { if (position && typeof position.nodeId === 'string' && typeof position.x === 'number' && typeof position.y === 'number') { layoutPositions.set(position.nodeId, position); } }); window.setTimeout(() => { applyLayout(); fitCanvas(); }, 0); }).catch(() => undefined); }
document.addEventListener('atlas-layout-updated', () => { void loadPersistedLayout(); });
void loadPersistedLayout();
})();`;
  }

  /**
   * Produces the self-contained browser behavior for graph filtering, selection, focus, and visual preferences.
   *
   * @returns Executable browser script without external network dependencies.
   */
  private createViewerScript(): string {
    return `(() => {
const graph = JSON.parse(document.getElementById('atlas-graph').textContent);
const elements = graph.elements;
const leafNodes = elements.nodes.filter((entry) => entry.data.compound !== true);
const packages = elements.nodes.filter((entry) => entry.data.compound === true);
const search = document.getElementById('atlas-search');
const externals = document.getElementById('atlas-externals');
const darkMode = document.getElementById('atlas-dark-mode');
const nodeList = document.getElementById('atlas-nodes');
const packageList = document.getElementById('atlas-packages');
const selection = document.getElementById('atlas-selection');
const relationshipList = document.getElementById('atlas-relationships');
const canvas = document.getElementById('atlas-canvas');
const exportPng = document.getElementById('atlas-export-png');
const autoLayout = document.getElementById('atlas-auto-layout');
const hideSelected = document.getElementById('atlas-hide-selected');
const splitExternals = document.getElementById('atlas-split-externals');
const createFolder = document.getElementById('atlas-create-folder');
const collapsedPackages = new Set();
const persistedPositions = new Map();
let selectedNodeId;
const storedDarkMode = localStorage.getItem('atlas-dark-mode') === 'true';
darkMode.checked = storedDarkMode;
document.body.classList.toggle('atlas-dark', storedDarkMode);
darkMode.addEventListener('change', () => { document.body.classList.toggle('atlas-dark', darkMode.checked); localStorage.setItem('atlas-dark-mode', String(darkMode.checked)); });
document.getElementById('atlas-clear-selection').addEventListener('click', () => { selectedNodeId = undefined; render(); });
search.addEventListener('input', render);
externals.addEventListener('change', render);
exportPng.addEventListener('click', () => { const source = new XMLSerializer().serializeToString(canvas).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'); const image = new Image(); image.addEventListener('load', () => { const bitmap = document.createElement('canvas'); bitmap.width = Math.max(1, Math.ceil(canvas.clientWidth)); bitmap.height = Math.max(1, Math.ceil(canvas.clientHeight)); const context = bitmap.getContext('2d'); if (!context) { return; } context.fillStyle = getComputedStyle(document.body).backgroundColor; context.fillRect(0, 0, bitmap.width, bitmap.height); context.drawImage(image, 0, 0, bitmap.width, bitmap.height); bitmap.toBlob((blob) => { if (!blob) { return; } void fetch('/api/png?scope=' + encodeURIComponent(graph.scope), { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob }); }, 'image/png'); }); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source); });
autoLayout.addEventListener('click', () => { const rows = Number(document.getElementById('atlas-rows').value); const horizontalGap = Number(document.getElementById('atlas-horizontal-gap').value); const verticalGap = Number(document.getElementById('atlas-vertical-gap').value); const orientation = document.getElementById('atlas-orientation').value; if (!Number.isInteger(rows) || rows <= 0 || !Number.isFinite(horizontalGap) || horizontalGap < 0 || !Number.isFinite(verticalGap) || verticalGap < 0 || (orientation !== 'horizontal' && orientation !== 'vertical')) { return; } autoLayout.disabled = true; void fetch('/api/layout/generate?scope=' + encodeURIComponent(graph.scope), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horizontalGap, orientation, rows, verticalGap }) }).then(loadLayout).then(() => { document.dispatchEvent(new Event('atlas-layout-updated')); }).finally(() => { autoLayout.disabled = false; }); });
function loadLayout() { return fetch('layout.json').then((response) => response.ok ? response.json() : undefined).then((layout) => { if (!layout || !Array.isArray(layout.positions)) { return; } persistedPositions.clear(); layout.positions.forEach((position) => { if (position && typeof position.nodeId === 'string' && typeof position.x === 'number' && Number.isFinite(position.x) && typeof position.y === 'number' && Number.isFinite(position.y)) { persistedPositions.set(position.nodeId, { x: position.x, y: position.y }); } }); render(); }).catch(() => undefined); }
function applyConfigurationAction(action) { return fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) }).then((response) => { if (response.status === 204) { window.location.reload(); } }); }
hideSelected.addEventListener('click', () => { const node = leafNodes.find((entry) => entry.data.id === selectedNodeId); if (!node) { return; } if (node.data.kind === 'external') { void applyConfigurationAction({ type: 'hide-external', value: node.data.label }); return; } if (typeof node.data.sourcePath === 'string') { void applyConfigurationAction({ type: 'hide-source', value: node.data.sourcePath }); } });
splitExternals.addEventListener('change', () => { if (graph.scope === 'landscape') { void applyConfigurationAction({ type: 'set-external-splitting', enabled: splitExternals.checked }); } else { splitExternals.checked = false; } });
createFolder.addEventListener('click', () => { const packageName = document.getElementById('atlas-folder-package').value.trim(); const path = document.getElementById('atlas-folder-path').value.trim(); if (!packageName || !path) { return; } void applyConfigurationAction({ type: 'create-folder-diagram', packageName, path }); });
function visible(node) { const query = search.value.trim().toLocaleLowerCase(); return (externals.checked || node.data.kind !== 'external') && !collapsedPackages.has(node.data.parent) && (!query || node.data.label.toLocaleLowerCase().includes(query)); }
function renderPackages() { packageList.replaceChildren(...packages.map((entry) => { const button = document.createElement('button'); const isCollapsed = collapsedPackages.has(entry.data.id); button.type = 'button'; button.textContent = (isCollapsed ? 'Expand ' : 'Collapse ') + entry.data.label; button.setAttribute('aria-expanded', String(!isCollapsed)); button.addEventListener('click', () => { isCollapsed ? collapsedPackages.delete(entry.data.id) : collapsedPackages.add(entry.data.id); render(); }); return button; })); }
function renderNodes() { nodeList.replaceChildren(...leafNodes.filter(visible).sort((left,right) => left.data.label.localeCompare(right.data.label) || left.data.id.localeCompare(right.data.id)).map((entry) => { const item = document.createElement('li'); const button = document.createElement('button'); button.type = 'button'; button.className = 'atlas-node'; button.dataset.kind = entry.data.kind; button.setAttribute('aria-pressed', String(selectedNodeId === entry.data.id)); button.textContent = entry.data.label + ' (' + entry.data.kind + ')'; button.addEventListener('click', () => { selectedNodeId = entry.data.id; render(); }); item.append(button); return item; })); }
function renderSelection() { relationshipList.replaceChildren(); if (!selectedNodeId) { selection.textContent = 'Select a node to inspect direct dependencies.'; return; } const node = leafNodes.find((entry) => entry.data.id === selectedNodeId); if (!node) { selectedNodeId = undefined; render(); return; } const direct = elements.edges.filter((edge) => edge.data.source === selectedNodeId || edge.data.target === selectedNodeId); const outbound = direct.filter((edge) => edge.data.source === selectedNodeId).length; const inbound = direct.length - outbound; selection.textContent = node.data.label + ': ' + outbound + ' outbound, ' + inbound + ' inbound direct relationship(s).'; relationshipList.replaceChildren(...direct.map((edge) => { const item = document.createElement('li'); const otherId = edge.data.source === selectedNodeId ? edge.data.target : edge.data.source; const other = leafNodes.find((entry) => entry.data.id === otherId); item.textContent = (edge.data.source === selectedNodeId ? '→ ' : '← ') + (other ? other.data.label : otherId) + ' [' + edge.data.relationshipType + ']'; return item; })); }
function svgElement(name) { return document.createElementNS('http://www.w3.org/2000/svg', name); }
function renderCanvas() { const nodes = leafNodes.filter(visible).sort((left,right) => left.data.label.localeCompare(right.data.label) || left.data.id.localeCompare(right.data.id)); const positions = new Map(); const columns = Math.max(1, Math.min(4, nodes.length)); const width = Math.max(480, columns * 190); const rows = Math.max(1, Math.ceil(nodes.length / columns)); const height = Math.max(240, rows * 110 + 40); canvas.setAttribute('viewBox', '0 0 ' + width + ' ' + height); canvas.replaceChildren(); nodes.forEach((entry, index) => positions.set(entry.data.id, { x: 30 + (index % columns) * 190, y: 30 + Math.floor(index / columns) * 110 })); elements.edges.filter((edge) => positions.has(edge.data.source) && positions.has(edge.data.target)).forEach((edge) => { const source = positions.get(edge.data.source); const target = positions.get(edge.data.target); const line = svgElement('line'); line.setAttribute('x1', String(source.x + 65)); line.setAttribute('y1', String(source.y + 28)); line.setAttribute('x2', String(target.x + 65)); line.setAttribute('y2', String(target.y + 28)); line.setAttribute('class', 'atlas-edge' + (selectedNodeId === edge.data.source || selectedNodeId === edge.data.target ? ' atlas-focused' : '')); if (edge.data.relationshipType === 'inheritance') { line.setAttribute('stroke-dasharray', '6 4'); } canvas.append(line); }); nodes.forEach((entry) => { const position = positions.get(entry.data.id); const group = svgElement('g'); group.setAttribute('tabindex', '0'); group.setAttribute('role', 'button'); group.setAttribute('aria-label', entry.data.label); const rect = svgElement('rect'); rect.setAttribute('x', String(position.x)); rect.setAttribute('y', String(position.y)); rect.setAttribute('width', '130'); rect.setAttribute('height', '56'); rect.setAttribute('rx', '8'); rect.setAttribute('class', 'atlas-node-shape' + (entry.data.kind === 'external' ? ' atlas-external' : '') + (selectedNodeId === entry.data.id ? ' atlas-selected' : '')); const text = svgElement('text'); text.setAttribute('x', String(position.x + 8)); text.setAttribute('y', String(position.y + 31)); text.setAttribute('class', 'atlas-node-label'); text.textContent = entry.data.label.length > 18 ? entry.data.label.slice(0, 17) + '…' : entry.data.label; group.addEventListener('click', () => { selectedNodeId = entry.data.id; render(); }); group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectedNodeId = entry.data.id; render(); } }); group.append(rect, text); canvas.append(group); }); }
function render() { renderPackages(); renderNodes(); renderCanvas(); renderSelection(); }
render();
void loadLayout();
})();`;
  }

  /**
   * Creates a self-contained dependency matrix HTML page for one diagram scope.
   *
   * @param diagram - Scope graph represented by the matrix.
   * @param navigation - Cross-scope navigation metadata.
   * @returns Complete matrix HTML document.
   */
  private createMatrixPage(
    diagram: DiagramGraph,
    navigation: readonly DiagramNavigationItem[]
  ): string {
    const nodes = [...diagram.nodes]
      .map((node) => ({
        id: node.id,
        path:
          node.sourcePath === undefined || node.moduleNode
            ? (node.sourcePath ?? node.label)
            : `${node.sourcePath}#${node.label}`
      }))
      .sort(
        (left, right) => left.path.localeCompare(right.path) || left.id.localeCompare(right.id)
      );
    const nodePaths = new Map(nodes.map((node) => [node.id, node.path]));
    const relationships = new Map<string, Set<string>>();
    diagram.relationships.forEach((relationship) => {
      const sourcePath = nodePaths.get(relationship.sourceId);
      const targetPath = nodePaths.get(relationship.targetId);
      if (sourcePath === undefined || targetPath === undefined) {
        return;
      }
      const key = `${sourcePath}\u0000${targetPath}`;
      const types = relationships.get(key) ?? new Set<string>();
      types.add(relationship.type);
      relationships.set(key, types);
    });
    const files = nodes.map((node) => node.path);
    const folderBands = this.createMatrixFolderBands(files);
    const dependencyCount = [...relationships.values()].reduce(
      (count, types) => count + types.size,
      0
    );
    const uniqueDependencyCount = relationships.size;
    const outboundCounts = new Map(files.map((file) => [file, 0]));
    const inboundCounts = new Map(files.map((file) => [file, 0]));
    relationships.forEach((_types, key) => {
      const [source = '', target = ''] = key.split('\u0000');
      outboundCounts.set(source, (outboundCounts.get(source) ?? 0) + 1);
      inboundCounts.set(target, (inboundCounts.get(target) ?? 0) + 1);
    });
    const possibleDependencies = files.length * Math.max(0, files.length - 1);
    const metrics = [
      ['Declarations', String(files.length)],
      ['Dependencies', String(dependencyCount)],
      [
        'Density',
        `${(possibleDependencies === 0 ? 0 : (uniqueDependencyCount / possibleDependencies) * 100).toFixed(2)}%`
      ],
      ['Avg outbound', (files.length === 0 ? 0 : dependencyCount / files.length).toFixed(2)],
      ['Max outbound', String(Math.max(0, ...outboundCounts.values()))],
      ['Max inbound', String(Math.max(0, ...inboundCounts.values()))],
      [
        'Isolated',
        String(
          files.filter(
            (file) => (outboundCounts.get(file) ?? 0) === 0 && (inboundCounts.get(file) ?? 0) === 0
          ).length
        )
      ],
      ['Cycle groups', String(this.createMatrixCycleGroupCount(files, relationships))]
    ];
    const headerCells = files
      .map((file, index) =>
        this.createMatrixColumnHeader(
          file,
          index,
          folderBands.get(file) ?? 0,
          this.createMatrixBoundaryClass(file, index, files, 'column')
        )
      )
      .join('');
    const rows = files
      .map((source, index) =>
        this.createMatrixRow(source, index, files, relationships, folderBands)
      )
      .join('');
    const metricHtml = metrics
      .map(
        ([label, value]) =>
          `<div class="metric"><span class="metric-label">${label}</span><span class="metric-value">${value}</span></div>`
      )
      .join('');

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>spec-n-roll dependency matrix</title><style>${this.createLegacyMatrixStyles()}</style></head>
<body>
<div class="shell" id="shell"><nav class="navigation" aria-label="Architecture pages"><div class="navigation-header"><button class="nav-toggle" id="nav-toggle" type="button" title="Toggle page navigation" aria-label="Toggle page navigation">&#9776;</button><div class="navigation-title">Architecture</div></div><div class="navigation-links">${this.createNavigationLinks(navigation, `${this.toScopeDirectoryName(diagram.scope)}/matrix.html`)}</div></nav><main class="workspace"><div class="summary" aria-label="Dependency graph metrics">${metricHtml}<button class="toolbar-button theme-toggle" id="toggle-dark-mode" type="button">Dark Mode</button></div><div class="matrix-scroll">${files.length === 0 ? '<div class="empty-state">No declaration dependencies were found for this graph.</div>' : `<table aria-label="Dependency matrix"><thead><tr><th scope="col">Declaration</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`}</div></main></div>
<script>const shell=document.getElementById('shell');const toggle=document.getElementById('toggle-dark-mode');function isDarkModeEnabled(){return document.body.classList.contains('dark-mode')}function setDarkMode(enabled){document.body.classList.toggle('dark-mode',enabled);toggle.classList.toggle('active',enabled)}function saveDarkModePreference(){localStorage.setItem('atlas-dark-mode',String(isDarkModeEnabled()))}function loadDarkModePreference(){setDarkMode(localStorage.getItem('atlas-dark-mode')==='true')}document.getElementById('nav-toggle').addEventListener('click',()=>shell.classList.toggle('nav-collapsed'));toggle.addEventListener('click',()=>{setDarkMode(!isDarkModeEnabled());saveDarkModePreference()});loadDarkModePreference()</script>
</body></html>\n`;
  }

  /**
   * Creates the archived matrix viewer stylesheet.
   *
   * @returns CSS rules for the legacy matrix shell, bands, sticky labels, and dark mode.
   */
  private createLegacyMatrixStyles(): string {
    return `${this.createLegacyViewerStyles()} .workspace{grid-template-rows:auto 1fr}.summary{align-items:center;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;gap:10px;min-height:44px;padding:8px 10px}.metric{background:#f8fafc;border:1px solid #d1d5db;border-radius:6px;display:grid;gap:2px;min-width:110px;padding:6px 8px}.metric-label{color:#64748b;font-size:11px;line-height:1.1}.metric-value{color:#111827;font-size:14px;font-weight:700;line-height:1.1}.matrix-scroll{overflow:auto;min-height:0;min-width:0}table{border-collapse:separate;border-spacing:0;font-size:12px;width:max-content}th,td{border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;height:38px;min-width:30px;padding:0;text-align:center}th{color:#334155;font-weight:700;position:sticky;z-index:1}thead th{top:0;vertical-align:bottom}tbody th{left:0;max-width:360px;min-width:280px;padding:0 10px;text-align:left;z-index:2}tbody tr.row-folder-even th{background:#fff;box-shadow:inset 6px 0 0 #14b8a6}tbody tr.row-folder-odd th{background:#f8fafc;box-shadow:inset 6px 0 0 #f59e0b}thead th:first-child{background:#f8fafc;left:0;min-width:280px;z-index:3}thead th.matrix-column{height:190px;max-width:30px;min-width:30px;overflow:hidden;position:sticky;width:30px}thead th.column-even{background:#f8fafc}thead th.column-odd{background:#eef2ff}thead th.column-folder-odd{box-shadow:inset 4px 0 0 #f59e0b}thead th.column-folder-even{box-shadow:inset 4px 0 0 #14b8a6}.row-label,.column-label{align-items:flex-start;display:flex;flex-direction:column;gap:2px;line-height:1.15;overflow:hidden;text-align:left}.row-label{max-width:330px;width:330px}.column-label{bottom:76px;left:50%;max-width:160px;position:absolute;transform:translateX(-50%) rotate(-90deg);transform-origin:center;width:160px}.row-file-name,.row-folder-path,.column-file-name,.column-folder-path{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row-file-name,.row-folder-path{max-width:330px}.column-file-name,.column-folder-path{max-width:160px}.row-file-name,.column-file-name{color:#111827;font-size:12px}.row-folder-path,.column-folder-path{color:#64748b;font-size:10px;font-weight:600}.folder-row-boundary th,.folder-row-boundary td{border-top:2px solid #94a3b8}.package-row-boundary th,.package-row-boundary td{border-top:3px solid #334155}.folder-column-boundary{border-left:2px solid #94a3b8}.package-column-boundary{border-left:3px solid #334155}td.matrix-cell{--column-overlay:transparent;--dependency-overlay:transparent;--folder-column-overlay:transparent;--folder-row-overlay:transparent;--row-background:#fff;background:linear-gradient(var(--dependency-overlay),var(--dependency-overlay)),linear-gradient(var(--folder-column-overlay),var(--folder-column-overlay)),linear-gradient(var(--folder-row-overlay),var(--folder-row-overlay)),linear-gradient(var(--column-overlay),var(--column-overlay)),var(--row-background);max-width:30px;min-width:30px;width:30px}td.column-odd{--column-overlay:rgba(37,99,235,.05)}td.column-even{--column-overlay:rgba(20,184,166,.03)}td.row-folder-even{--row-background:#fff;--folder-row-overlay:rgba(20,184,166,.035)}td.row-folder-odd{--row-background:#f8fafc;--folder-row-overlay:rgba(245,158,11,.06)}td.column-folder-odd{--folder-column-overlay:rgba(245,158,11,.06)}td.column-folder-even{--folder-column-overlay:rgba(20,184,166,.035)}td.has-dependency{--dependency-overlay:rgba(37,99,235,.88);color:#fff;font-weight:700}td.self:not(.has-dependency){--dependency-overlay:rgba(100,116,139,.18);color:transparent}.empty-state{color:#64748b;font-size:14px;padding:24px}.theme-toggle{margin-left:auto}.dark-mode .navigation,.dark-mode thead th:first-child,.dark-mode thead th.column-even,.dark-mode tbody tr.row-folder-odd th{background:#111827}.dark-mode .summary{background:#0f172a;border-bottom-color:#334155}.dark-mode .metric{background:#111827;border-color:#334155}.dark-mode .metric-label,.dark-mode .row-folder-path,.dark-mode .column-folder-path,.dark-mode .empty-state{color:#94a3b8}.dark-mode .metric-value,.dark-mode .row-file-name,.dark-mode .column-file-name,.dark-mode th{color:#e5e7eb}.dark-mode th,.dark-mode td{border-bottom-color:#334155;border-right-color:#334155}.dark-mode tbody tr.row-folder-even th,.dark-mode td.row-folder-even{background:#0f172a}.dark-mode thead th.column-odd,.dark-mode td.row-folder-odd{background:#1e1b4b}.dark-mode td.matrix-cell{--row-background:#0f172a}.dark-mode td.column-odd{--column-overlay:rgba(129,140,248,.08)}.dark-mode td.column-even{--column-overlay:rgba(45,212,191,.05)}.dark-mode td.row-folder-even{--folder-row-overlay:rgba(45,212,191,.05)}.dark-mode td.row-folder-odd{--row-background:#111827;--folder-row-overlay:rgba(251,191,36,.08)}.dark-mode td.has-dependency{--dependency-overlay:rgba(124,58,237,.9)}`;
  }

  /**
   * Creates the archived matrix header cell for one declaration.
   *
   * @returns Sticky rotated declaration label markup.
   */
  private createMatrixColumnHeader(
    file: string,
    index: number,
    folderBand: number,
    boundaryClass: string
  ): string {
    const label = this.createMatrixPathLabel(file);
    return `<th class="matrix-column ${this.createMatrixColumnClass(index)} ${this.createMatrixColumnFolderClass(folderBand)} ${boundaryClass}" scope="col" title="${this.escapeHtml(file)}"><span class="column-label"><span class="column-file-name">${this.escapeHtml(label.fileName)}</span><span class="column-folder-path">${this.escapeHtml(label.folderPath)}</span></span></th>`;
  }

  /**
   * Creates one legacy matrix data row.
   *
   * @returns Complete row markup with grouped dependency cells.
   */
  private createMatrixRow(
    source: string,
    index: number,
    files: readonly string[],
    relationships: ReadonlyMap<string, ReadonlySet<string>>,
    folderBands: ReadonlyMap<string, number>
  ): string {
    const rowFolderClass = this.createMatrixRowFolderClass(folderBands.get(source) ?? 0);
    const label = this.createMatrixPathLabel(source);
    const cells = files
      .map((target, columnIndex) =>
        this.createMatrixCell(
          source,
          target,
          relationships,
          columnIndex,
          rowFolderClass,
          this.createMatrixColumnFolderClass(folderBands.get(target) ?? 0),
          this.createMatrixBoundaryClass(target, columnIndex, files, 'column')
        )
      )
      .join('');
    return `<tr class="${rowFolderClass} ${this.createMatrixBoundaryClass(source, index, files, 'row')}"><th scope="row" title="${this.escapeHtml(source)}"><span class="row-label"><span class="row-file-name">${this.escapeHtml(label.fileName)}</span><span class="row-folder-path">${this.escapeHtml(label.folderPath)}</span></span></th>${cells}</tr>`;
  }

  /**
   * Creates one dependency matrix cell with the archived display code and tooltip.
   *
   * @returns Cell markup for a directed declaration pair.
   */
  private createMatrixCell(
    source: string,
    target: string,
    relationships: ReadonlyMap<string, ReadonlySet<string>>,
    columnIndex: number,
    rowFolderClass: string,
    columnFolderClass: string,
    boundaryClass: string
  ): string {
    const types = relationships.get(`${source}\u0000${target}`) ?? new Set<string>();
    const hasDependency = types.size > 0;
    const typeText =
      types.has('reference') && types.has('inheritance')
        ? 'reference and inheritance'
        : types.has('inheritance')
          ? 'inheritance'
          : 'reference';
    const cellText =
      types.has('reference') && types.has('inheritance')
        ? 'R+I'
        : types.has('inheritance')
          ? 'I'
          : types.has('reference')
            ? 'R'
            : '';
    const classes = [
      'matrix-cell',
      this.createMatrixColumnClass(columnIndex),
      rowFolderClass,
      columnFolderClass,
      boundaryClass,
      hasDependency ? 'has-dependency' : '',
      source === target ? 'self' : ''
    ]
      .filter(Boolean)
      .join(' ');
    const title = hasDependency
      ? `${source} has ${typeText} relationship to ${target}`
      : `${source} does not depend on ${target}`;
    return `<td class="${classes}" title="${this.escapeHtml(title)}">${cellText}</td>`;
  }

  /**
   * Counts strongly connected declaration groups with more than one member.
   *
   * @returns Number of cyclic dependency components represented by the matrix.
   */
  private createMatrixCycleGroupCount(
    files: readonly string[],
    relationships: ReadonlyMap<string, ReadonlySet<string>>
  ): number {
    const adjacency = new Map(files.map((file) => [file, [] as string[]]));
    relationships.forEach((_types, key) => {
      const [source = '', target = ''] = key.split('\u0000');
      adjacency.get(source)?.push(target);
    });
    const indexes = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    const stack: string[] = [];
    const stacked = new Set<string>();
    let nextIndex = 0;
    let cycleGroups = 0;
    const visit = (file: string): void => {
      indexes.set(file, nextIndex);
      lowLinks.set(file, nextIndex);
      nextIndex += 1;
      stack.push(file);
      stacked.add(file);
      for (const dependency of adjacency.get(file) ?? []) {
        if (!indexes.has(dependency)) {
          visit(dependency);
          lowLinks.set(file, Math.min(lowLinks.get(file) ?? 0, lowLinks.get(dependency) ?? 0));
        } else if (stacked.has(dependency)) {
          lowLinks.set(file, Math.min(lowLinks.get(file) ?? 0, indexes.get(dependency) ?? 0));
        }
      }
      if (lowLinks.get(file) !== indexes.get(file)) {
        return;
      }
      let componentSize = 0;
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member !== undefined) {
          stacked.delete(member);
          componentSize += 1;
        }
      } while (member !== undefined && member !== file);
      if (componentSize > 1) {
        cycleGroups += 1;
      }
    };
    files.forEach((file) => {
      if (!indexes.has(file)) {
        visit(file);
      }
    });
    return cycleGroups;
  }

  /**
   * Assigns alternating folder bands in stable declaration order.
   *
   * @returns Folder band values keyed by declaration path.
   */
  private createMatrixFolderBands(files: readonly string[]): ReadonlyMap<string, number> {
    const bands = new Map<string, number>();
    let folder = '';
    let band = -1;
    files.forEach((file) => {
      const nextFolder = this.createMatrixFolderPath(file);
      if (nextFolder !== folder) {
        folder = nextFolder;
        band += 1;
      }
      bands.set(file, band);
    });
    return bands;
  }

  /**
   * Creates name and folder labels from a declaration path.
   *
   * @returns Display-ready path segments.
   */
  private createMatrixPathLabel(file: string): {
    readonly fileName: string;
    readonly folderPath: string;
  } {
    const segments = file.replaceAll('\\', '/').split('/');
    const fileName = segments.pop() ?? file;
    return { fileName, folderPath: segments.join('/') || '.' };
  }

  /**
   * Determines the boundary class between adjacent matrix declarations.
   *
   * @returns CSS class for a folder or package boundary.
   */
  private createMatrixBoundaryClass(
    file: string,
    index: number,
    files: readonly string[],
    axis: 'row' | 'column'
  ): string {
    if (index === 0) {
      return '';
    }
    const previous = files[index - 1] ?? file;
    if (this.createMatrixPackagePath(file) !== this.createMatrixPackagePath(previous)) {
      return axis === 'row' ? 'package-row-boundary' : 'package-column-boundary';
    }
    return this.createMatrixFolderPath(file) !== this.createMatrixFolderPath(previous)
      ? axis === 'row'
        ? 'folder-row-boundary'
        : 'folder-column-boundary'
      : '';
  }

  /**
   * Returns the package grouping prefix used by legacy matrix separators.
   *
   * @returns First source package segment, where available.
   */
  private createMatrixPackagePath(file: string): string {
    const segments = file.replaceAll('\\', '/').split('/');
    return segments[0] === 'src' && segments[1]
      ? `${segments[0]}/${segments[1]}`
      : (segments[0] ?? file);
  }

  /**
   * Returns the source folder grouping prefix for a declaration.
   *
   * @returns Declaration directory path without its final filename.
   */
  private createMatrixFolderPath(file: string): string {
    const segments = file.replaceAll('\\', '/').split('/');
    segments.pop();
    return segments.join('/');
  }

  /**
   * Creates an alternating column color class.
   *
   * @returns Even or odd column CSS class.
   */
  private createMatrixColumnClass(index: number): string {
    return index % 2 === 0 ? 'column-even' : 'column-odd';
  }

  /**
   * Creates an alternating row folder color class.
   *
   * @returns Even or odd row-folder CSS class.
   */
  private createMatrixRowFolderClass(folderBand: number): string {
    return folderBand % 2 === 0 ? 'row-folder-even' : 'row-folder-odd';
  }

  /**
   * Creates an alternating column folder color class.
   *
   * @returns Even or odd column-folder CSS class.
   */
  private createMatrixColumnFolderClass(folderBand: number): string {
    return folderBand % 2 === 0 ? 'column-folder-even' : 'column-folder-odd';
  }

  /**
   * Builds stable navigation metadata for every graph and matching matrix page.
   *
   * @param diagrams - Sorted generated diagram graphs.
   * @returns Navigation items sorted by diagram scope.
   */
  private createNavigation(diagrams: readonly DiagramGraph[]): readonly DiagramNavigationItem[] {
    return diagrams.map((diagram) => ({
      scope: diagram.scope,
      title: diagram.title,
      graphPath: `${this.toScopeDirectoryName(diagram.scope)}/index.html`,
      matrixPath: `${this.toScopeDirectoryName(diagram.scope)}/matrix.html`
    }));
  }

  /**
   * Creates an always-expanded page listing every diagram and matrix link.
   *
   * @param navigation - Graph and matrix navigation items.
   * @param activePath - Optional artifact-root-relative path of the displayed page.
   * @returns Complete navigation HTML document.
   */
  private createNavigationPage(navigation: readonly DiagramNavigationItem[]): string {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Atlas Navigation</title></head><body><h1>Atlas Diagrams</h1><nav>${this.createNavigationLinks(navigation)}</nav></body></html>\n`;
  }

  /**
   * Renders always-expanded diagram and matrix navigation links.
   *
   * @param navigation - Graph and matrix navigation items.
   * @returns HTML list markup.
   */
  private createNavigationLinks(
    navigation: readonly DiagramNavigationItem[],
    activePath?: string
  ): string {
    return navigation
      .map((item) => {
        const graphCurrent = item.graphPath === activePath ? ' current' : '';
        const matrixCurrent = item.matrixPath === activePath ? ' current' : '';
        return `<section><div class="navigation-group-title">${this.escapeHtml(item.title)}</div><div class="navigation-children"><a class="navigation-link${graphCurrent}" href="/${this.escapeHtml(item.graphPath)}">Diagram</a><a class="navigation-link${matrixCurrent}" href="/${this.escapeHtml(item.matrixPath)}">Matrix</a></div></section>`;
      })
      .join('');
  }

  /**
   * Converts a stable scope identifier into an artifact-root-relative directory path.
   *
   * @param scope - Landscape or package diagram scope.
   * @returns Safe artifact-root-relative scope directory path.
   */
  private toScopeDirectoryName(scope: DiagramGraph['scope']): string {
    if (scope === 'landscape') {
      return 'landscape';
    }
    if (scope.startsWith('package:')) {
      return `packages/${encodeURIComponent(scope.slice('package:'.length))}`;
    }
    if (scope.startsWith('group:')) {
      return `groups/${encodeURIComponent(scope.slice('group:'.length))}`;
    }
    return `folders/${encodeURIComponent(scope.slice('folder:'.length))}`;
  }

  /**
   * Escapes text for safe HTML element content and attribute values.
   *
   * @param value - Untrusted text value.
   * @returns HTML-escaped text.
   */
  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Resolves and verifies one artifact child path remains inside its artifact parent directory.
   *
   * @param rootPath - Absolute artifact parent directory.
   * @param childPath - Relative artifact child path.
   * @returns Lexically resolved contained path.
   */
  private resolveContainedPath(rootPath: string, childPath: string): string {
    const resolvedPath = resolve(rootPath, childPath);
    const relativePath = relative(rootPath, resolvedPath);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error(`Atlas artifact path '${childPath}' escapes configured root '${rootPath}'.`);
    }
    return resolvedPath;
  }

  /**
   * Serializes one graph document deterministically with sorted object keys and a trailing newline.
   *
   * @param value - Serializable graph document value.
   * @returns Canonical JSON text.
   */
  private serialize(value: unknown): string {
    return `${JSON.stringify(this.sortValue(value), undefined, 2)}\n`;
  }

  /**
   * Recursively sorts object keys while retaining canonical graph array ordering.
   *
   * @param value - Serializable value to sort.
   * @returns Deeply sorted serializable value.
   */
  private sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sortValue(entry));
    }
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    const sortedValue: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
      sortedValue[key] = this.sortValue((value as Record<string, unknown>)[key]);
    }
    return sortedValue;
  }

  /**
   * Replaces one artifact file through a same-directory temporary file.
   *
   * @param artifactPath - Absolute contained artifact file path.
   * @param contents - Complete artifact content.
   * @returns A promise that resolves after atomic replacement completes.
   */
  private async writeAtomically(artifactPath: string, contents: string): Promise<void> {
    const temporaryPath = `${artifactPath}.tmp-${process.pid}`;
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, artifactPath);
  }
}

/**
 * Represents one generated diagram and matrix navigation destination.
 */
interface DiagramNavigationItem {
  /**
   * Stable scope identifier represented by the linked artifact pages.
   */
  readonly scope: DiagramGraph['scope'];

  /**
   * Human-readable diagram title.
   */
  readonly title: string;

  /**
   * Artifact-root-relative diagram page path.
   */
  readonly graphPath: string;

  /**
   * Artifact-root-relative matrix page path.
   */
  readonly matrixPath: string;
}

/**
 * Describes the validated JSON shape of a version-one persisted layout document.
 */
interface PersistedLayoutDocument {
  /**
   * Identifies the supported persisted layout schema.
   */
  readonly schemaVersion: 1;

  /**
   * Contains saved node positions.
   */
  readonly positions: readonly PersistedLayoutPosition[];

  /**
   * Contains intentionally hidden relationship identifiers.
   */
  readonly hiddenRelationshipIds: readonly string[];
}

/**
 * Describes the validated JSON shape of one persisted node position.
 */
interface PersistedLayoutPosition {
  /**
   * Identifies the positioned graph node.
   */
  readonly nodeId: string;

  /**
   * Identifies the optional compound parent of the positioned node.
   */
  readonly parentId?: string;

  /**
   * Stores the absolute horizontal model coordinate.
   */
  readonly x: number;

  /**
   * Stores the absolute vertical model coordinate.
   */
  readonly y: number;
}
