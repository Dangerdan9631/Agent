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
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
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
    const sortedDiagrams = [...diagrams].sort((left, right) =>
      left.scope.localeCompare(right.scope)
    );
    const navigation = this.createNavigation(sortedDiagrams);

    for (const diagram of sortedDiagrams) {
      await this.writeDiagram(workspace, artifactRootPath, diagram, navigation);
    }

    await this.writeAtomically(
      this.resolveContainedPath(artifactRootPath, 'navigation.html'),
      this.createNavigationPage(navigation)
    );
    const landscape = sortedDiagrams.find((diagram) => diagram.scope === 'landscape');
    if (landscape !== undefined) {
      await this.writeAtomically(
        this.resolveContainedPath(artifactRootPath, 'index.html'),
        this.createViewerPage(landscape, navigation)
      );
    }
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
    const navigation = this.createNavigation(
      [...allDiagrams].sort((left, right) => left.scope.localeCompare(right.scope))
    );
    await this.writeDiagram(workspace, artifactRootPath, diagram, navigation);
    await this.writeAtomically(
      this.resolveContainedPath(artifactRootPath, 'navigation.html'),
      this.createNavigationPage(navigation)
    );
    if (diagram.scope === 'landscape') {
      await this.writeAtomically(
        this.resolveContainedPath(artifactRootPath, 'index.html'),
        this.createViewerPage(diagram, navigation)
      );
    }
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
    const graphDocument = this.createGraphDocument(diagram);
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
      this.createViewerPage(diagram, navigation)
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
      data.moduleNode
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
   * @param diagram - Scope graph to transform.
   * @returns Serializable Cytoscape-compatible graph document.
   */
  private createGraphDocument(diagram: DiagramGraph): Record<string, unknown> {
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
    const directoryNodes = this.createDirectoryCompoundNodes(diagram.nodes);
    const declarationNodes = diagram.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        kind: node.kind,
        packageName: node.packageName,
        sourcePath: node.sourcePath,
        moduleNode: node.moduleNode,
        parent: this.toCompoundParentId(node)
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
        nodes: [...packageNodes, ...directoryNodes, ...declarationNodes],
        edges
      }
    };
  }

  /**
   * Produces one nested compound element for every local declaration directory.
   *
   * @param nodes - Diagram declarations whose source paths determine directory hierarchy.
   * @returns Sorted Cytoscape directory compound elements with stable package-scoped identifiers.
   */
  private createDirectoryCompoundNodes(
    nodes: readonly DeclarationNode[]
  ): readonly Record<string, unknown>[] {
    const directories = new Map<string, { readonly packageName: string; readonly path: string }>();
    for (const node of nodes) {
      if (node.packageName === undefined || node.sourcePath === undefined) {
        continue;
      }
      const segments = node.sourcePath.split('/').filter((segment) => segment.length > 0);
      segments.pop();
      for (let depth = 1; depth <= segments.length; depth += 1) {
        const path = segments.slice(0, depth).join('/');
        directories.set(this.toDirectoryCompoundId(node.packageName, path), {
          packageName: node.packageName,
          path
        });
      }
    }
    return [...directories.entries()]
      .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
      .map(([id, directory]) => {
        const parentPath = directory.path.includes('/')
          ? directory.path.slice(0, directory.path.lastIndexOf('/'))
          : undefined;
        return {
          data: {
            id,
            label: directory.path.split('/').at(-1),
            kind: 'directory',
            compound: true,
            parent:
              parentPath === undefined
                ? `package:${encodeURIComponent(directory.packageName)}`
                : this.toDirectoryCompoundId(directory.packageName, parentPath)
          }
        };
      });
  }

  /**
   * Selects the deepest available compound parent for one declaration node.
   *
   * @param node - Declaration whose package and source directory determine containment.
   * @returns Stable directory or package parent ID, or undefined for non-local dependencies.
   */
  private toCompoundParentId(node: DeclarationNode): string | undefined {
    if (node.packageName === undefined) {
      return undefined;
    }
    if (node.sourcePath === undefined || !node.sourcePath.includes('/')) {
      return `package:${encodeURIComponent(node.packageName)}`;
    }
    const directoryPath = node.sourcePath.slice(0, node.sourcePath.lastIndexOf('/'));
    return directoryPath.length === 0
      ? `package:${encodeURIComponent(node.packageName)}`
      : this.toDirectoryCompoundId(node.packageName, directoryPath);
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
   * Creates a self-contained static viewer shell that embeds graph data and navigation.
   *
   * @param diagram - Scope graph embedded by the page.
   * @param navigation - Cross-scope navigation metadata.
   * @returns Complete HTML viewer document.
   */
  private createViewerPage(
    diagram: DiagramGraph,
    navigation: readonly DiagramNavigationItem[]
  ): string {
    const embeddedGraph = this.createScriptJson(this.createGraphDocument(diagram));

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(diagram.title)}</title></head>
<body>
<nav aria-label="Atlas diagrams">${this.createNavigationLinks(navigation)}</nav>
<main class="atlas-viewer"><h1>${this.escapeHtml(diagram.title)}</h1><p id="summary">${diagram.nodes.length} nodes, ${diagram.relationships.length} relationships.</p>
<section class="atlas-controls" aria-label="Diagram controls"><label>Search <input id="atlas-search" type="search" autocomplete="off"></label><label><input id="atlas-externals" type="checkbox" checked> Show external dependencies</label><label><input id="atlas-dark-mode" type="checkbox"> Dark mode</label><label><input id="atlas-snap" type="checkbox"> Snap to grid</label><label>Orientation <select id="atlas-orientation"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label><label>Rows <input id="atlas-rows" type="number" min="1" value="6"></label><label>Horizontal gap <input id="atlas-horizontal-gap" type="number" min="0" value="80"></label><label>Vertical gap <input id="atlas-vertical-gap" type="number" min="0" value="60"></label><button id="atlas-auto-layout" type="button">Auto layout</button><button id="atlas-clear-selection" type="button">Clear selection</button><button id="atlas-export-png" type="button">Export PNG</button></section>
<section class="atlas-controls" aria-label="Diagram policy actions"><button id="atlas-hide-selected" type="button">Hide selected node</button><label><input id="atlas-split-externals" type="checkbox"> Split landscape externals</label><label>Folder package <input id="atlas-folder-package" type="text"></label><label>Folder path <input id="atlas-folder-path" type="text" placeholder="src/feature"></label><button id="atlas-create-folder" type="button">Create folder diagram</button></section>
<section class="atlas-content"><aside><h2>Groups</h2><div id="atlas-packages"></div><h2>Nodes</h2><ul id="atlas-nodes"></ul></aside><section><h2>Diagram</h2><svg id="atlas-canvas" role="img" aria-label="Interactive declaration relationship diagram"></svg><h2>Selection</h2><p id="atlas-selection">Select a node to inspect direct dependencies.</p><h2>Direct relationships</h2><ul id="atlas-relationships"></ul></section></section></main>
<script id="atlas-graph" type="application/json">${embeddedGraph}</script>
<style>body{font-family:system-ui,sans-serif;margin:1rem;background:#fff;color:#1d2430}nav ul,.atlas-controls{display:flex;gap:.75rem;flex-wrap:wrap;padding:0;list-style:none}.atlas-controls{align-items:center}.atlas-content{display:grid;grid-template-columns:minmax(16rem,1fr) 2fr;gap:1rem}.atlas-content aside{border-right:1px solid #bbc5d1;padding-right:1rem}button{cursor:pointer}#atlas-nodes,#atlas-relationships{list-style:none;padding:0}.atlas-node{width:100%;margin:.15rem 0;text-align:left}.atlas-node[data-kind="external"]{font-style:italic}.atlas-node[aria-pressed="true"]{outline:2px solid #337ab7}#atlas-canvas{width:100%;min-height:26rem;border:1px solid #bbc5d1;background:#f8fafc}.atlas-edge{stroke:#718096;stroke-width:2}.atlas-edge.atlas-focused{stroke:#3182ce;stroke-width:3}.atlas-node-shape{fill:#e2e8f0;stroke:#4a5568;stroke-width:1.5;cursor:pointer}.atlas-node-shape.atlas-external{fill:#fef3c7}.atlas-node-shape.atlas-selected{stroke:#2563eb;stroke-width:4}.atlas-node-label{font-size:12px;pointer-events:none}.atlas-hidden{display:none}body.atlas-dark{background:#1a202c;color:#e2e8f0}body.atlas-dark a{color:#90cdf4}body.atlas-dark .atlas-content aside,body.atlas-dark #atlas-canvas{border-color:#4a5568}body.atlas-dark #atlas-canvas{background:#2d3748}body.atlas-dark .atlas-node-shape{fill:#4a5568;stroke:#cbd5e0}body.atlas-dark .atlas-node-shape.atlas-external{fill:#744210}body.atlas-dark .atlas-node-label{fill:#edf2f7}@media(max-width:48rem){.atlas-content{grid-template-columns:1fr}.atlas-content aside{border-right:0;padding-right:0}}</style>
<script>${this.createViewerScript()}</script>
<script>${this.createLayoutPersistenceScript()}</script>
</body></html>\n`;
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
function saveLayout() { const groups = groupsByNode(); groups.forEach((group, nodeId) => { const rect = group.querySelector('rect'); const node = leaves.find((entry) => entry.data.id === nodeId); if (!rect || !node) { return; } layoutPositions.set(nodeId, { parentId: node.data.parent, x: Number(rect.getAttribute('x')) + 65, y: Number(rect.getAttribute('y')) + 28 }); }); const positions = [...layoutPositions.entries()].map(([nodeId, position]) => ({ nodeId, parentId: position.parentId, x: position.x, y: position.y })); void fetch('/api/layout?scope=' + encodeURIComponent(graph.scope), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, positions, hiddenRelationshipIds: [] }) }); }
function canvasPoint(event) { const bounds = canvas.getBoundingClientRect(); const viewBox = canvas.viewBox.baseVal; return { x: viewBox.x + (event.clientX - bounds.left) * viewBox.width / bounds.width, y: viewBox.y + (event.clientY - bounds.top) * viewBox.height / bounds.height }; }
canvas.addEventListener('pointerdown', (event) => { const group = event.target.closest('g[aria-label]'); if (!group || !group.dataset.atlasNodeId) { return; } const rect = group.querySelector('rect'); if (!rect) { return; } const point = canvasPoint(event); drag = { nodeId: group.dataset.atlasNodeId, offsetX: point.x - Number(rect.getAttribute('x')), offsetY: point.y - Number(rect.getAttribute('y')) }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => { if (!drag) { return; } const point = canvasPoint(event); const node = leaves.find((entry) => entry.data.id === drag.nodeId); if (!node) { return; } const x = point.x - drag.offsetX + 65; const y = point.y - drag.offsetY + 28; const snap = document.getElementById('atlas-snap').checked; layoutPositions.set(drag.nodeId, { parentId: node.data.parent, x: snap ? Math.round(x / 20) * 20 : x, y: snap ? Math.round(y / 20) * 20 : y }); applyLayout(); });
canvas.addEventListener('pointerup', (event) => { if (!drag) { return; } drag = undefined; canvas.releasePointerCapture(event.pointerId); saveLayout(); window.setTimeout(applyLayout, 0); });
function loadPersistedLayout() { return fetch('layout.json').then((response) => response.ok ? response.json() : undefined).then((layout) => { if (!layout || !Array.isArray(layout.positions)) { return; } layoutPositions.clear(); layout.positions.forEach((position) => { if (position && typeof position.nodeId === 'string' && typeof position.x === 'number' && typeof position.y === 'number') { layoutPositions.set(position.nodeId, position); } }); window.setTimeout(applyLayout, 0); }).catch(() => undefined); }
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
    const nodes = [...diagram.nodes].sort((left, right) => left.id.localeCompare(right.id));
    const relationships = new Map(
      diagram.relationships.map((relationship) => [
        `${relationship.sourceId}\u0000${relationship.targetId}`,
        relationship.type
      ])
    );
    const headerCells = nodes.map((node) => `<th>${this.escapeHtml(node.label)}</th>`).join('');
    const rows = nodes
      .map((sourceNode) => {
        const cells = nodes
          .map((targetNode) => {
            const relationshipType = relationships.get(`${sourceNode.id}\u0000${targetNode.id}`);
            const value =
              relationshipType === 'inheritance'
                ? 'inherits'
                : relationshipType === 'reference'
                  ? 'uses'
                  : '';
            return `<td>${value}</td>`;
          })
          .join('');
        return `<tr><th>${this.escapeHtml(sourceNode.label)}</th>${cells}</tr>`;
      })
      .join('');

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(diagram.title)} matrix</title></head>
<body>
<nav aria-label="Atlas diagrams">${this.createNavigationLinks(navigation)}</nav>
<main><h1>${this.escapeHtml(diagram.title)} dependency matrix</h1><table><thead><tr><th></th>${headerCells}</tr></thead><tbody>${rows}</tbody></table></main>
</body></html>\n`;
  }

  /**
   * Builds stable navigation metadata for every graph and matching matrix page.
   *
   * @param diagrams - Sorted generated diagram graphs.
   * @returns Navigation items sorted by diagram scope.
   */
  private createNavigation(diagrams: readonly DiagramGraph[]): readonly DiagramNavigationItem[] {
    return diagrams.map((diagram) => ({
      title: diagram.title,
      graphPath: `${this.toScopeDirectoryName(diagram.scope)}/index.html`,
      matrixPath: `${this.toScopeDirectoryName(diagram.scope)}/matrix.html`
    }));
  }

  /**
   * Creates an always-expanded page listing every diagram and matrix link.
   *
   * @param navigation - Graph and matrix navigation items.
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
  private createNavigationLinks(navigation: readonly DiagramNavigationItem[]): string {
    return `<ul>${navigation
      .map(
        (item) =>
          `<li>${this.escapeHtml(item.title)}: <a href="${this.escapeHtml(item.graphPath)}">diagram</a> <a href="${this.escapeHtml(item.matrixPath)}">matrix</a></li>`
      )
      .join('')}</ul>`;
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
