import { writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
import { ArchitectureViewerAutoLayoutScript } from '#arch/infrastructure/cytoscape/architecture-viewer-auto-layout-script.js';
import { ArchitectureViewerDarkModeScript } from '#arch/infrastructure/cytoscape/architecture-viewer-dark-mode-script.js';

/**
 * Defines the rendered graph label font size in pixels for architecture diagrams.
 */
const ARCHITECTURE_LABEL_FONT_SIZE = 25;

/**
 * Defines the schema version for persisted architecture diagram layouts.
 */
const ARCHITECTURE_LAYOUT_VERSION = 3;

/**
 * Defines the background color used when exporting architecture diagrams.
 */
const ARCHITECTURE_LIGHT_EXPORT_BACKGROUND_COLOR = '#ffffff';

/**
 * Defines the dark canvas color used when exporting architecture diagrams.
 */
const ARCHITECTURE_DARK_EXPORT_BACKGROUND_COLOR = '#0f172a';

/**
 * Defines the slowest wheel sensitivity used by architecture diagrams.
 */
const ARCHITECTURE_MINIMUM_WHEEL_SENSITIVITY = 0.15;

/**
 * Defines the fastest wheel sensitivity used by architecture diagrams.
 */
const ARCHITECTURE_MAXIMUM_WHEEL_SENSITIVITY = 1;

/**
 * Writes Cytoscape graph artifacts to disk.
 */
export class CytoscapeArtifactWriter {
  /**
   * Writes matching Cytoscape JSON and browser-renderable HTML graph artifacts.
   *
   * @param cytoscapeJsonPath - Absolute destination path for the JSON artifact.
   * @param cytoscapeHtmlPath - Absolute destination path for the HTML artifact.
   * @param elements - Cytoscape graph elements to serialize.
   * @param pages - Generated HTML pages to show in the navigation pane.
   */
  write(
    cytoscapeJsonPath: string,
    cytoscapeHtmlPath: string,
    elements: CytoscapeElement[],
    pages: ArchitecturePage[] = [
      { title: 'Dependency graph', htmlPath: cytoscapeHtmlPath },
    ],
  ): void {
    writeFileSync(cytoscapeJsonPath, `${JSON.stringify(elements, null, 2)}\n`);
    writeFileSync(
      cytoscapeHtmlPath,
      this.renderHtml(elements, pages, cytoscapeHtmlPath),
    );
  }

  private renderHtml(
    elements: CytoscapeElement[],
    pages: ArchitecturePage[],
    currentPath: string,
  ): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>spec-n-roll dependency graph</title>
    <script src="https://unpkg.com/cytoscape@3.31.2/dist/cytoscape.min.js"></script>
    <style>
      html, body { height: 100%; margin: 0; }
      body { background: #ffffff; color: #111827; font-family: Arial, sans-serif; overflow: hidden; }
      body.dark-mode { background: #0f172a; color: #e5e7eb; }
      .shell { display: grid; grid-template-columns: 280px 1fr; height: 100%; min-width: 0; transition: grid-template-columns 160ms ease; }
      .shell.nav-collapsed { grid-template-columns: 44px 1fr; }
      .navigation { background: #f8fafc; border-right: 1px solid #d1d5db; min-width: 0; overflow: hidden; }
      .navigation-header { align-items: center; display: flex; gap: 8px; height: 44px; padding: 0 8px; }
      .nav-toggle { align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #111827; cursor: pointer; display: inline-flex; height: 28px; justify-content: center; width: 28px; }
      .navigation-title { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .navigation-links, .navigation-children { display: flex; flex-direction: column; gap: 2px; padding: 0 8px 12px; }
      .navigation-children { padding: 0 0 0 16px; }
      .nav-collapsed .navigation-title, .nav-collapsed .navigation-links { display: none; }
      .navigation-group-title { color: #0f172a; font-size: 13px; font-weight: 700; line-height: 1.3; padding: 8px 10px 4px; }
      .navigation-link { border-radius: 6px; color: #334155; display: block; font-size: 13px; line-height: 1.3; padding: 8px 10px; text-decoration: none; }
      .navigation-link:hover { background: #e2e8f0; color: #0f172a; }
      .navigation-link.current { background: #dbeafe; color: #1d4ed8; font-weight: 700; }
      .workspace { display: grid; grid-template-rows: auto 1fr auto; min-height: 0; min-width: 0; }
      .toolbar { border-bottom: 1px solid #d1d5db; display: grid; gap: 6px; padding: 6px 10px; }
      .toolbar-row { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
      .toolbar-row-primary .theme-toggle { margin-left: auto; }
      .search-input { border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; height: 30px; min-width: 220px; padding: 0 10px; }
      .toolbar-button { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #111827; cursor: pointer; font-size: 13px; height: 30px; padding: 0 10px; }
      .toolbar-button.active { background: #1d4ed8; border-color: #1d4ed8; color: #ffffff; }
      .toolbar-button:disabled { cursor: not-allowed; opacity: 0.45; }
      .toolbar-separator { color: #94a3b8; font-size: 18px; line-height: 30px; }
      .graph-legend { color: #475569; display: inline-flex; font-size: 12px; gap: 8px; margin-left: 8px; }
      .graph-legend-item { align-items: center; display: inline-flex; gap: 4px; }
      .legend-swatch { border-radius: 50%; display: inline-block; height: 10px; width: 10px; }
      .legend-class { background: #3b82f6; } .legend-interface { background: #14b8a6; } .legend-other { background: #f59e0b; }
      .legend-edge { border-top: 2px solid #94a3b8; display: inline-block; width: 18px; } .legend-inheritance { border-top-style: dashed; }
      .layout-control { align-items: center; display: inline-flex; font-size: 12px; gap: 6px; white-space: nowrap; }
      .layout-control input { accent-color: #2563eb; width: 96px; }
      .layout-control output { color: #475569; font-variant-numeric: tabular-nums; min-width: 24px; }
      .exclusion-control { margin-left: auto; position: relative; }
      .exclusion-menu { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18); display: grid; gap: 8px; padding: 10px; position: absolute; right: 0; top: 36px; width: 300px; z-index: 2; }
      .exclusion-menu[hidden] { display: none; }
      .exclusion-section { display: grid; gap: 6px; }
      .exclusion-section + .exclusion-section { border-top: 1px solid #d1d5db; padding-top: 8px; }
      .exclusion-label { color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .exclusion-rule { align-items: center; display: flex; font-size: 12px; gap: 6px; overflow-wrap: anywhere; }
      .exclusion-add { display: flex; gap: 6px; }
      .exclusion-add input { border: 1px solid #cbd5e1; border-radius: 4px; flex: 1; font-size: 12px; height: 26px; min-width: 0; padding: 0 6px; }
      .exclusion-add button { min-width: 28px; padding: 0; }
      .status-bar { align-items: center; border-top: 1px solid #d1d5db; display: flex; min-height: 28px; padding: 0 10px; }
      .layout-status { color: #64748b; font-size: 12px; min-width: 142px; }
      .layout-status.error { color: #b91c1c; }
      .dark-mode .navigation { background: #111827; border-right-color: #334155; }
      .dark-mode .nav-toggle, .dark-mode .toolbar-button, .dark-mode .search-input, .dark-mode .exclusion-menu, .dark-mode .exclusion-add input { background: #1f2937; border-color: #475569; color: #e5e7eb; }
      .dark-mode .toolbar-separator, .dark-mode .layout-control output { color: #94a3b8; }
      .dark-mode .graph-legend { color: #cbd5e1; }
      .dark-mode .navigation-link { color: #cbd5e1; }
      .dark-mode .navigation-group-title { color: #e5e7eb; }
      .dark-mode .navigation-link:hover { background: #334155; color: #f8fafc; }
      .dark-mode .navigation-link.current, .dark-mode .toolbar-button.active { background: #6d28d9; border-color: #6d28d9; color: #ffffff; }
      .dark-mode .toolbar { background: #0f172a; border-bottom-color: #334155; }
      .dark-mode .layout-status, .dark-mode .exclusion-label { color: #94a3b8; }
      .dark-mode .layout-status.error { color: #fca5a5; }
      #cy { background: #ffffff; height: 100%; min-height: 0; min-width: 0; width: 100%; }
      .dark-mode #cy { background: #0f172a; }
    </style>
  </head>
  <body>
    <div class="shell" id="shell">
      <nav class="navigation" aria-label="Architecture pages">
        <div class="navigation-header">
          <button class="nav-toggle" id="nav-toggle" type="button" title="Toggle page navigation" aria-label="Toggle page navigation">&#9776;</button>
          <div class="navigation-title">Architecture</div>
        </div>
        <div class="navigation-links">
          ${this.renderNavigation(pages, currentPath, dirname(currentPath))}
        </div>
      </nav>
      <main class="workspace">
        <div class="toolbar" aria-label="Graph controls">
          <div class="toolbar-row toolbar-row-primary">
            <input class="search-input" id="search" type="search" placeholder="Search nodes" />
            <button class="toolbar-button active" id="filter-both" type="button">Both</button>
            <button class="toolbar-button" id="filter-inbound" type="button">Inbound</button>
            <button class="toolbar-button" id="filter-outbound" type="button">Outbound</button>
            <button class="toolbar-button" id="filter-none" type="button">None</button>
            <span class="toolbar-separator" aria-hidden="true">|</span>
            <button class="toolbar-button active" id="toggle-external" type="button">External</button>
            <button class="toolbar-button" id="toggle-hidden-connections" type="button">Hidden</button>
            <span class="toolbar-separator" aria-hidden="true">|</span>
            <button class="toolbar-button" id="create-folder-diagram" type="button" disabled>Create Diagram</button>
            <button class="toolbar-button" id="export-diagram-image" type="button">Export Image</button>
            <button class="toolbar-button" id="export-all-diagram-images" type="button">Export All</button>
            <button class="toolbar-button theme-toggle" id="toggle-dark-mode" type="button">Dark Mode</button>
            <span class="graph-legend" aria-label="Graph legend"><span class="graph-legend-item"><i class="legend-swatch legend-class"></i>Class</span><span class="graph-legend-item"><i class="legend-swatch legend-interface"></i>Interface</span><span class="graph-legend-item"><i class="legend-swatch legend-other"></i>Other</span><span class="graph-legend-item"><i class="legend-edge"></i>Reference</span><span class="graph-legend-item"><i class="legend-edge legend-inheritance"></i>Implements/extends</span></span>
          </div>
          <div class="toolbar-row toolbar-row-secondary">
            <button class="toolbar-button" id="fit-diagram" type="button">Fit</button>
            <span class="toolbar-separator" aria-hidden="true">|</span>
            <button class="toolbar-button" id="collapse-group" type="button" disabled>Collapse</button>
            <button class="toolbar-button" id="hide-action" type="button" disabled>Hide</button>
            <button class="toolbar-button" id="split-external-dependency" type="button" disabled>Split</button>
            <span class="toolbar-separator" aria-hidden="true">|</span>
            <button class="toolbar-button" id="auto-layout" type="button">Auto layout</button>
            <button class="toolbar-button" id="vertical-layout" type="button" aria-pressed="false">Vertical</button>
            <label class="layout-control" for="layout-rows">Layout Rows
              <input id="layout-rows" type="range" min="3" max="8" value="5" />
              <output id="layout-rows-value" for="layout-rows">5</output>
            </label>
            <label class="layout-control" for="horizontal-gap">Horizontal Gap
              <input id="horizontal-gap" type="range" min="80" max="200" step="5" value="120" />
              <output id="horizontal-gap-value" for="horizontal-gap">120</output>
            </label>
            <label class="layout-control" for="vertical-gap">Vertical Gap
              <input id="vertical-gap" type="range" min="80" max="200" step="5" value="120" />
              <output id="vertical-gap-value" for="vertical-gap">120</output>
            </label>
            <span class="toolbar-separator" aria-hidden="true">|</span>
            <button class="toolbar-button" id="snap-diagram" type="button">Snap</button>
            <label class="layout-control" for="snap-grid">Snap grid
              <input id="snap-grid" type="range" min="5" max="100" step="5" value="20" />
              <output id="snap-grid-value" for="snap-grid">20</output>
            </label>
            <div class="exclusion-control">
              <button class="toolbar-button" id="excluded-toggle" type="button" aria-expanded="false">Excluded</button>
              <div class="exclusion-menu" id="excluded-menu" hidden></div>
            </div>
          </div>
        </div>
        <div id="cy"></div>
        <div class="status-bar"><span class="layout-status" id="layout-status" aria-live="polite"></span></div>
      </main>
    </div>
    <script>
      const cy = cytoscape({
        container: document.getElementById('cy'),
        userZoomingEnabled: false,
        elements: ${JSON.stringify(elements)},
        style: [
          { selector: 'node', style: { label: 'data(label)', 'background-color': '#3b82f6', color: '#111827', 'font-size': ${ARCHITECTURE_LABEL_FONT_SIZE}, 'text-wrap': 'wrap', 'text-max-width': 180 } },
          { selector: ':parent', style: { label: 'data(label)', 'background-color': '#f8fafc', 'border-color': '#64748b', 'border-width': 1, padding: 24, 'text-valign': 'top', 'text-halign': 'center' } },
          { selector: 'node[externalDependency = "true"]', style: { 'background-color': '#6b7280', color: '#111827' } },
          { selector: 'node[workspaceDependency = "true"]', style: { 'background-color': '#f3f0ff', color: '#111827' } },
          { selector: 'node[nodeKind = "class"]', style: { 'background-color': '#3b82f6' } },
          { selector: 'node[nodeKind = "interface"]', style: { 'background-color': '#14b8a6' } },
          { selector: 'node[nodeKind = "other"]', style: { 'background-color': '#f59e0b' } },
          { selector: 'edge', style: { width: 2, 'line-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'curve-style': 'bezier' } },
          { selector: 'edge[relationshipType = "inheritance"]', style: { 'line-style': 'dashed' } },
          { selector: 'node.collapsed-proxy', style: { shape: 'round-rectangle', width: 160, height: 64, 'background-color': '#f59e0b', 'border-color': '#b45309', 'border-width': 2, color: '#111827', 'text-valign': 'center', 'text-halign': 'center' } },
          { selector: 'edge.collapsed-proxy', style: { 'line-style': 'dashed' } },
          { selector: 'edge.hidden-connection', style: { opacity: 0.22, 'line-style': 'dotted' } },
          { selector: 'edge.selected-connection', style: { 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', width: 6 } },
          { selector: '.faded', style: { opacity: 0.12 } },
          { selector: 'edge.inbound', style: { 'line-color': '#16a34a', 'target-arrow-color': '#16a34a', width: 4 } },
          { selector: 'edge.outbound', style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb', width: 4 } },
          { selector: '.hidden-by-filter', style: { display: 'none' } },
          { selector: 'node.search-match', style: { 'border-color': '#f59e0b', 'border-width': 4 } }
        ]
      });

      const BASE_WHEEL_SENSITIVITY = 0.5;
      const MINIMUM_WHEEL_SENSITIVITY = ${ARCHITECTURE_MINIMUM_WHEEL_SENSITIVITY};
      const MAXIMUM_WHEEL_SENSITIVITY = ${ARCHITECTURE_MAXIMUM_WHEEL_SENSITIVITY};
      const WHEEL_ZOOM_EXPONENT = 0.001;
      const FIT_PADDING = 36;
      const LAYOUT_STORAGE_VERSION = ${ARCHITECTURE_LAYOUT_VERSION};
      ${ArchitectureViewerAutoLayoutScript.render()}

      class DiagramLayoutClient {
        constructor(pagePath) {
          this.pagePath = pagePath;
          this.layoutPath = pagePath.replace(/\\.html$/u, '.layout.json');
          this.savePath = '/__spec-n-roll/layout?diagram=' + encodeURIComponent(pagePath.replace(/^\\//u, ''));
        }

        async read() {
          try {
            const response = await fetch(this.layoutPath, { cache: 'no-store' });
            if (response.status === 404) {
              return null;
            }
            if (!response.ok) {
              throw new Error('Layout read failed.');
            }
            return await response.json();
          } catch {
            return null;
          }
        }

        async write(layout) {
          const response = await fetch(this.savePath, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(layout),
          });
          if (!response.ok) {
            throw new Error('Layout autosave failed.');
          }
        }
      }

      class DiagramConfigClient {
        constructor(pagePath) {
          this.savePath = '/__spec-n-roll/config?diagram=' + encodeURIComponent(pagePath.replace(/^\\//u, ''));
        }

        async write(action) {
          const response = await fetch(this.savePath, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(action),
          });
          if (!response.ok) {
            throw new Error('Config update failed.');
          }
        }

        async read() {
          const response = await fetch(this.savePath, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error('Config read failed.');
          }
          return await response.json();
        }
      }

      class DiagramImageExportClient {
        constructor(pagePath) {
          this.savePath = '/__spec-n-roll/image?diagram=' + encodeURIComponent(pagePath.replace(/^\\//u, ''));
        }

        async write(image) {
          const response = await fetch(this.savePath, {
            method: 'POST',
            headers: { 'content-type': 'image/png' },
            body: image,
          });
          if (!response.ok) {
            throw new Error('Image export failed.');
          }
          return await response.json();
        }
      }

      class DiagramImageExporter {
        constructor(graph, client, status) {
          this.graph = graph;
          this.client = client;
          this.status = status;
        }

        async export() {
          this.status.textContent = 'Exporting image';
          this.status.classList.remove('error');
          try {
            const result = await this.client.write(this.imageBlob());
            this.status.textContent = 'Image exported: ' + result.fileName;
            this.status.classList.remove('error');
            return true;
          } catch {
            this.status.textContent = 'Image export failed';
            this.status.classList.add('error');
            return false;
          }
        }

        imageBlob() {
          return this.graph.png({
            bg: document.body.classList.contains('dark-mode') ? '${ARCHITECTURE_DARK_EXPORT_BACKGROUND_COLOR}' : '${ARCHITECTURE_LIGHT_EXPORT_BACKGROUND_COLOR}',
            full: true,
            output: 'blob',
            scale: 2,
          });
        }
      }

      class AllDiagramImagesExporter {
        constructor(pagePaths, status) {
          this.pagePaths = pagePaths;
          this.status = status;
        }

        async export() {
          this.status.classList.remove('error');
          for (const [index, pagePath] of this.pagePaths.entries()) {
            this.status.textContent = 'Exporting image ' + (index + 1) + ' of ' + this.pagePaths.length;
            try {
              await this.exportPage(pagePath);
            } catch {
              this.status.textContent = 'Export all failed on image ' + (index + 1) + ' of ' + this.pagePaths.length;
              this.status.classList.add('error');
              return;
            }
          }
          this.status.textContent = 'All images exported: ' + this.pagePaths.length;
        }

        exportPage(pagePath) {
          return new Promise((resolve, reject) => {
            const frame = document.createElement('iframe');
            frame.style.position = 'fixed';
            frame.style.left = '-10000px';
            frame.style.width = '1280px';
            frame.style.height = '720px';
            frame.style.border = '0';
            frame.addEventListener('load', () => {
              const exportImage = frame.contentWindow && frame.contentWindow.exportDiagramImage;
              if (typeof exportImage !== 'function') {
                frame.remove();
                reject(new Error('Diagram image exporter was unavailable.'));
                return;
              }
              Promise.resolve(exportImage())
                .then((succeeded) => succeeded ? resolve() : reject(new Error('Diagram image export failed.')), reject)
                .finally(() => frame.remove());
            }, { once: true });
            frame.addEventListener('error', () => {
              frame.remove();
              reject(new Error('Diagram page failed to load.'));
            }, { once: true });
            frame.src = pagePath;
            document.body.append(frame);
          });
        }
      }

      class DiagramGridSnapper {
        constructor(graph) {
          this.graph = graph;
        }

        snap(gridSize, selectedNode) {
          const nodes = this.nodesToSnap(selectedNode);
          this.graph.batch(() => {
            nodes.forEach((node) => {
              const position = node.position();
              node.position({
                x: Math.round(position.x / gridSize) * gridSize,
                y: Math.round(position.y / gridSize) * gridSize,
              });
            });
          });
        }

        nodesToSnap(selectedNode) {
          const scope = selectedNode && !isCollapsedProxyNode(selectedNode) && selectedNode.children().length > 0
            ? selectedNode.union(selectedNode.descendants())
            : this.graph.nodes();
          return scope.filter((node) => !isCollapsedProxyNode(node) && node.children().length === 0);
        }
      }

      class DiagramLayoutStore {
        constructor(graph, client, status, hiddenConnectionState) {
          this.graph = graph;
          this.client = client;
          this.status = status;
          this.hiddenConnectionState = hiddenConnectionState;
          this.saveTimeout = null;
          this.pendingSave = null;
        }

        async applySavedLayout() {
          const savedLayout = await this.client.read();
          if (!savedLayout || savedLayout.version !== LAYOUT_STORAGE_VERSION || !savedLayout.nodes) {
            return false;
          }

          this.hiddenConnectionState.replace(savedLayout.hiddenConnections ?? []);

          const nodeEntries = Object.entries(savedLayout.nodes)
            .filter(([nodeId, position]) => this.canApply(nodeId, position))
            .sort(([leftId], [rightId]) => this.depth(leftId) - this.depth(rightId));

          for (const [nodeId, savedPosition] of nodeEntries) {
            const node = this.graph.getElementById(nodeId);
            node.position(savedPosition.position);
          }

          return nodeEntries.length > 0;
        }

        saveSoon() {
          window.clearTimeout(this.saveTimeout);
          this.saveTimeout = window.setTimeout(() => {
            void this.saveNow();
          }, 100);
        }

        async flushPendingSave() {
          window.clearTimeout(this.saveTimeout);
          this.saveTimeout = null;
          if (this.pendingSave) {
            await this.pendingSave;
            return;
          }
          await this.saveNow();
        }

        async saveNow() {
          const layout = this.currentLayout();
          this.status.textContent = 'Saving layout';
          this.status.classList.remove('error');
          const save = this.client.write(layout)
            .then(() => {
              this.status.textContent = 'Layout saved';
              this.status.classList.remove('error');
            })
            .catch(() => {
              this.status.textContent = 'Layout autosave unavailable';
              this.status.classList.add('error');
            })
            .finally(() => {
              if (this.pendingSave === save) {
                this.pendingSave = null;
              }
            });
          this.pendingSave = save;
          await save;
        }

        currentLayout() {
          const nodes = {};

          this.graph.nodes().not('.collapsed-proxy').forEach((node) => {
            nodes[node.id()] = this.snapshot(node);
          });

          return {
            version: LAYOUT_STORAGE_VERSION,
            nodes,
            hiddenConnections: this.hiddenConnectionState.ids(),
          };
        }

        canApply(nodeId, savedPosition) {
          if (!savedPosition || !savedPosition.position) {
            return false;
          }

          const node = this.graph.getElementById(nodeId);
          if (node.empty()) {
            return false;
          }

          const currentParentId = this.parentId(node);
          if (savedPosition.parentId !== currentParentId) {
            return false;
          }

          return !savedPosition.parentId || !this.graph.getElementById(savedPosition.parentId).empty();
        }

        depth(nodeId) {
          return this.graph.getElementById(nodeId).ancestors().length;
        }

        parentId(node) {
          const parent = node.parent();
          return parent.empty() ? null : parent.id();
        }

        snapshot(node) {
          const parentId = this.parentId(node);
          const position = node.position();

          return {
            parentId,
            position: {
              x: position.x,
              y: position.y,
            },
          };
        }
      }
      class HiddenConnectionState {
        constructor() {
          this.hiddenConnectionIds = new Set();
          this.showHiddenConnections = false;
        }

        replace(edgeIds) {
          this.hiddenConnectionIds = new Set(edgeIds);
        }

        hide(edgeId) {
          this.hiddenConnectionIds.add(edgeId);
        }

        isHidden(edgeId) {
          return this.hiddenConnectionIds.has(edgeId);
        }

        toggleVisibility() {
          this.showHiddenConnections = !this.showHiddenConnections;
        }

        showsHiddenConnections() {
          return this.showHiddenConnections;
        }

        ids() {
          return [...this.hiddenConnectionIds].sort();
        }
      }
      const currentDiagramPath = window.location.pathname === '/' ? '/landscape.cytoscape.html' : window.location.pathname;
      const layoutStatus = document.getElementById('layout-status');
      const hiddenConnectionState = new HiddenConnectionState();
      const layoutStore = new DiagramLayoutStore(
        cy,
        new DiagramLayoutClient(currentDiagramPath),
        layoutStatus,
        hiddenConnectionState,
      );
      const configClient = new DiagramConfigClient(currentDiagramPath);
      const excludedToggle = document.getElementById('excluded-toggle');
      const excludedMenu = document.getElementById('excluded-menu');

      class DiagramExclusionMenu {
        constructor(client, menu, toggle, status) {
          this.client = client;
          this.menu = menu;
          this.toggle = toggle;
          this.status = status;
        }

        async toggleMenu() {
          const opens = this.menu.hidden;
          this.menu.hidden = !opens;
          this.toggle.setAttribute('aria-expanded', String(opens));
          if (opens) {
            await this.render();
          }
        }

        async render() {
          try {
            this.renderExclusions(await this.client.read());
          } catch {
            this.status.textContent = 'Exclusions unavailable';
            this.status.classList.add('error');
          }
        }

        renderExclusions(exclusions) {
          this.menu.replaceChildren(
            this.section('All packages', 'all-packages', exclusions.allPackages),
            this.section(exclusions.diagramLabel, 'diagram', exclusions.diagram),
          );
        }

        section(label, scope, exclusions) {
          const section = document.createElement('section');
          section.className = 'exclusion-section';
          const heading = document.createElement('div');
          heading.className = 'exclusion-label';
          heading.textContent = label;
          section.append(heading);

          for (const exclusion of exclusions) {
            const row = document.createElement('label');
            row.className = 'exclusion-rule';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.addEventListener('change', () => {
              if (!checkbox.checked) {
                void this.update('remove-exclusion', scope, exclusion);
              }
            });
            const text = document.createElement('span');
            text.textContent = exclusion;
            row.append(checkbox, text);
            section.append(row);
          }

          const add = document.createElement('div');
          add.className = 'exclusion-add';
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = 'Node name or glob';
          const button = document.createElement('button');
          button.className = 'toolbar-button';
          button.type = 'button';
          button.textContent = '+';
          button.addEventListener('click', () => {
            void this.update('add-exclusion', scope, input.value);
          });
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void this.update('add-exclusion', scope, input.value);
            }
          });
          add.append(input, button);
          section.append(add);
          return section;
        }

        async update(action, scope, exclusion) {
          const value = exclusion.trim();
          if (!value) {
            return;
          }

          try {
            await this.client.write({ action, scope, exclusion: value });
            window.location.reload();
          } catch {
            this.status.textContent = 'Exclusion update failed';
            this.status.classList.add('error');
          }
        }
      }

      const exclusionMenu = new DiagramExclusionMenu(
        configClient,
        excludedMenu,
        excludedToggle,
        layoutStatus,
      );
      const imageExporter = new DiagramImageExporter(
        cy,
        new DiagramImageExportClient(currentDiagramPath),
        layoutStatus,
      );
      const allImagesExporter = new AllDiagramImagesExporter(
        ${JSON.stringify(this.diagramPagePaths(pages, dirname(currentPath)))},
        layoutStatus,
      );
      const autoLayout = new DiagramAutoLayout(cy);

      function fitGraph() {
        cy.resize();
        cy.fit(undefined, FIT_PADDING);
      }

      async function initializeDiagramLayout() {
        const hasSavedLayout = await layoutStore.applySavedLayout();

        if (!hasSavedLayout) {
          autoLayout.layout();
          layoutStore.saveSoon();
        }

        requestAnimationFrame(fitGraph);
      }

      const diagramReady = initializeDiagramLayout();
      window.exportDiagramImage = async () => {
        await diagramReady;
        return imageExporter.export();
      };

      function normalizedWheelDelta(event) {
        if (event.deltaMode === 1) {
          return event.deltaY * 16;
        }
        if (event.deltaMode === 2) {
          return event.deltaY * 800;
        }
        return event.deltaY;
      }

      cy.container().addEventListener('wheel', (event) => {
        event.preventDefault();

        const deltaY = normalizedWheelDelta(event);
        if (deltaY === 0) {
          return;
        }

        const zoom = cy.zoom();
        const dynamicSensitivity = Math.min(
          MAXIMUM_WHEEL_SENSITIVITY,
          Math.max(MINIMUM_WHEEL_SENSITIVITY, BASE_WHEEL_SENSITIVITY / zoom),
        );
        const factor = Math.pow(10, -deltaY * WHEEL_ZOOM_EXPONENT * dynamicSensitivity);

        cy.zoom({
          level: zoom * factor,
          renderedPosition: { x: event.clientX, y: event.clientY },
        });
      }, { passive: false });

      let selectedNode = null;
      let selectedEdgeId = null;
      let dependencyMode = 'both';
      let showExternalDependencies = true;
      let verticalLayoutEnabled = false;
      const locallyCreatedFolderDiagramKeys = new Set();
      const collapsedGroupIds = new Set();

      const shell = document.getElementById('shell');
      const search = document.getElementById('search');
      const modeButtons = {
        both: document.getElementById('filter-both'),
        inbound: document.getElementById('filter-inbound'),
        outbound: document.getElementById('filter-outbound'),
        none: document.getElementById('filter-none')
      };
      const externalToggle = document.getElementById('toggle-external');
      const fitDiagram = document.getElementById('fit-diagram');
      const autoLayoutButton = document.getElementById('auto-layout');
      const verticalLayout = document.getElementById('vertical-layout');
      const exportDiagramImage = document.getElementById('export-diagram-image');
      const exportAllDiagramImages = document.getElementById('export-all-diagram-images');
      const hideAction = document.getElementById('hide-action');
      const splitExternalDependency = document.getElementById('split-external-dependency');
      const hiddenConnectionToggle = document.getElementById('toggle-hidden-connections');
      const collapseGroup = document.getElementById('collapse-group');
      const createFolderDiagram = document.getElementById('create-folder-diagram');
      const layoutRows = document.getElementById('layout-rows');
      const layoutRowsValue = document.getElementById('layout-rows-value');
      const horizontalGap = document.getElementById('horizontal-gap');
      const horizontalGapValue = document.getElementById('horizontal-gap-value');
      const verticalGap = document.getElementById('vertical-gap');
      const verticalGapValue = document.getElementById('vertical-gap-value');
      const snapDiagram = document.getElementById('snap-diagram');
      const snapGrid = document.getElementById('snap-grid');
      const snapGridValue = document.getElementById('snap-grid-value');
      const gridSnapper = new DiagramGridSnapper(cy);
      const darkModeToggle = document.getElementById('toggle-dark-mode');
      ${ArchitectureViewerDarkModeScript.render()}

      document.getElementById('nav-toggle').addEventListener('click', () => {
        shell.classList.toggle('nav-collapsed');
        fitGraph();
      });
      excludedToggle.addEventListener('click', () => void exclusionMenu.toggleMenu());


      function diagramTheme() {
        const darkMode = document.body.classList.contains('dark-mode');
        return darkMode
          ? {
              fileNode: '#60a5fa',
              classNode: '#60a5fa',
              interfaceNode: '#2dd4bf',
              otherNode: '#fbbf24',
              workspaceNode: '#1f1633',
              externalNode: '#9ca3af',
              collapsedNode: '#fbbf24',
              collapsedBorder: '#f59e0b',
              parentBackground: '#1f2937',
              parentBorder: '#64748b',
              text: '#e5e7eb',
              edge: '#64748b',
              inbound: '#22c55e',
              outbound: '#60a5fa',
              search: '#fbbf24',
            }
          : {
              fileNode: '#3b82f6',
              classNode: '#3b82f6',
              interfaceNode: '#14b8a6',
              otherNode: '#f59e0b',
              workspaceNode: '#f3f0ff',
              externalNode: '#6b7280',
              collapsedNode: '#f59e0b',
              collapsedBorder: '#b45309',
              parentBackground: '#f8fafc',
              parentBorder: '#64748b',
              text: '#111827',
              edge: '#94a3b8',
              inbound: '#16a34a',
              outbound: '#2563eb',
              search: '#f59e0b',
            };
      }

      function applyDiagramTheme() {
        const theme = diagramTheme();
        cy.style()
          .selector('node')
          .style({ 'background-color': theme.fileNode, color: theme.text })
          .selector(':parent')
          .style({ 'background-color': theme.parentBackground, 'border-color': theme.parentBorder, color: theme.text })
          .selector('node[externalDependency = "true"]')
          .style({ 'background-color': theme.externalNode, color: theme.text })
          .selector('node[workspaceDependency = "true"]')
          .style({ 'background-color': theme.workspaceNode, color: theme.text })
          .selector('node[nodeKind = "class"]')
          .style({ 'background-color': theme.classNode, color: theme.text })
          .selector('node[nodeKind = "interface"]')
          .style({ 'background-color': theme.interfaceNode, color: theme.text })
          .selector('node[nodeKind = "other"]')
          .style({ 'background-color': theme.otherNode, color: theme.text })
          .selector('node.collapsed-proxy')
          .style({ 'background-color': theme.collapsedNode, 'border-color': theme.collapsedBorder, color: theme.text })
          .selector('edge')
          .style({ 'line-color': theme.edge, 'target-arrow-color': theme.edge })
          .selector('edge.inbound')
          .style({ 'line-color': theme.inbound, 'target-arrow-color': theme.inbound })
          .selector('edge.outbound')
          .style({ 'line-color': theme.outbound, 'target-arrow-color': theme.outbound })
          .selector('edge.selected-connection')
          .style({ 'line-color': theme.search, 'target-arrow-color': theme.search })
          .selector('node.search-match')
          .style({ 'border-color': theme.search })
          .update();
      }

      function toggleDarkMode() {
        setDarkMode(!isDarkModeEnabled());
        saveDarkModePreference();
        applyDiagramTheme();
      }

      function existingPagePaths() {
        return new Set(
          [...document.querySelectorAll('.navigation-link')].map((link) =>
            new URL(link.href).pathname.replace(/^\\//u, ''),
          ),
        );
      }

      function normalizeConfigPath(value) {
        return value.replaceAll('\\\\', '/').replace(/^\\.\\//u, '').replace(/\\/$/u, '');
      }

      function folderDiagramKey(packageName, folderPath) {
        return packageName + ':' + normalizeConfigPath(folderPath);
      }

      function folderDiagramPagePath(packageName, folderPath) {
        return packageName + '/folder-' + normalizeConfigPath(folderPath).replaceAll('/', '-') + '.cytoscape.html';
      }

      function hasFolderDiagram(packageName, folderPath) {
        return existingPagePaths().has(folderDiagramPagePath(packageName, folderPath)) ||
          locallyCreatedFolderDiagramKeys.has(folderDiagramKey(packageName, folderPath));
      }

      function selectedScope() {
        if (!selectedNode) {
          return cy.collection();
        }

        return selectedNode.union(selectedNode.descendants());
      }


      function collapsedNodeId(groupId) {
        return 'collapsed:' + groupId;
      }

      function originalEdgeId(edge) {
        return edge.data('originalEdgeId') || edge.id();
      }

      function isCollapsedProxyNode(node) {
        return !!node.data('collapsedGroupId');
      }

      function collapsedEndpointId(node) {
        for (const groupId of collapsedGroupIds) {
          const group = cy.getElementById(groupId);
          if (!group.empty() && (node.same(group) || node.ancestors().anySame(group))) {
            return collapsedNodeId(groupId);
          }
        }

        return node.id();
      }

      function synchronizeCollapsedGroups() {
        const previousPositions = new Map();
        cy.nodes('.collapsed-proxy').forEach((node) => {
          previousPositions.set(node.data('collapsedGroupId'), node.position());
        });
        cy.elements('.collapsed-proxy').remove();

        for (const groupId of [...collapsedGroupIds]) {
          const group = cy.getElementById(groupId);
          if (group.empty()) {
            collapsedGroupIds.delete(groupId);
            continue;
          }

          const nodeId = collapsedNodeId(groupId);
          cy.add({
            group: 'nodes',
            classes: 'collapsed-proxy',
            data: {
              id: nodeId,
              label: group.data('label'),
              collapsedGroupId: groupId,
            },
            position: previousPositions.get(groupId) ?? group.position(),
          });
        }

        cy.edges().not('.collapsed-proxy').forEach((edge) => {
          const sourceId = collapsedEndpointId(edge.source());
          const targetId = collapsedEndpointId(edge.target());
          if (sourceId === targetId || (sourceId === edge.source().id() && targetId === edge.target().id())) {
            return;
          }

          cy.add({
            group: 'edges',
            classes: 'collapsed-proxy',
            data: {
              id: 'collapsed-edge:' + edge.id() + ':' + sourceId + '->' + targetId,
              source: sourceId,
              target: targetId,
              originalEdgeId: edge.id(),
            },
          });
        });
      }

      function hideCollapsedGroups() {
        for (const groupId of collapsedGroupIds) {
          const group = cy.getElementById(groupId);
          if (!group.empty()) {
            group.union(group.descendants()).addClass('hidden-by-filter');
          }
        }
      }
      function dependencyEdges() {
        const scope = selectedScope();
        if (scope.empty()) {
          return { inbound: cy.collection(), outbound: cy.collection() };
        }

        const inbound = cy.edges().filter((edge) => edge.target().anySame(scope) && !edge.source().anySame(scope));
        const outbound = cy.edges().filter((edge) => edge.source().anySame(scope) && !edge.target().anySame(scope));

        return { inbound, outbound };
      }

      function visibleDependencyElements() {
        if (!selectedNode) {
          return cy.elements();
        }

        const edges = dependencyEdges();
        let visibleEdges = cy.collection();

        if (dependencyMode === 'both' || dependencyMode === 'inbound') {
          visibleEdges = visibleEdges.union(edges.inbound);
        }
        if (dependencyMode === 'both' || dependencyMode === 'outbound') {
          visibleEdges = visibleEdges.union(edges.outbound);
        }

        const visibleNodes = selectedScope().union(visibleEdges.connectedNodes());
        return visibleNodes.union(visibleNodes.parents()).union(visibleEdges);
      }

      function visibleSearchNodes() {
        const query = search.value.trim().toLowerCase();
        if (!query) {
          return cy.nodes();
        }

        const matches = cy.nodes().filter((node) => node.data('label').toLowerCase().includes(query));
        return matches.union(matches.parents());
      }

      function isExternalNode(node) {
        return node.data('externalDependency') === 'true';
      }

      function projectFileSelection(node) {
        if (isExternalNode(node) || node.children().length > 0) {
          return null;
        }

        const match = /^src\\/([^/]+)\\/(.+)$/u.exec(normalizeConfigPath(node.id()));
        return match ? { packageName: match[1], packageRelativePath: match[2] } : null;
      }

      function folderSelection(node) {
        const normalizedId = normalizeConfigPath(node.id());
        const folderRootMatch = /^folder:([^:]+):(.+)$/u.exec(normalizedId);
        if (folderRootMatch) {
          return { packageName: folderRootMatch[1], folderPath: normalizeConfigPath(folderRootMatch[2]) };
        }

        const folderChildMatch = /^directory:folder:([^:]+):(.+):(.+)$/u.exec(normalizedId);
        if (folderChildMatch) {
          return { packageName: folderChildMatch[1], folderPath: normalizeConfigPath(folderChildMatch[2] + '/' + folderChildMatch[3]) };
        }

        const packageFolderMatch = /^directory:([^:]+):(.+)$/u.exec(normalizedId);
        return packageFolderMatch ? { packageName: packageFolderMatch[1], folderPath: normalizeConfigPath('src/' + packageFolderMatch[2]) } : null;
      }

      function canHideSelectedNode() {
        return !!selectedNode && (isExternalNode(selectedNode) || !!projectFileSelection(selectedNode));
      }

      function canToggleSelectedExternalDependencySplit() {
        return !!selectedNode && isExternalNode(selectedNode) && currentDiagramPath === '/landscape.cytoscape.html';
      }

      function isSelectedExternalDependencySplit() {
        return canToggleSelectedExternalDependencySplit() && selectedNode.data('splitExternalDependency') === 'true';
      }

      function canHideSelectedConnection() {
        return !!selectedEdgeId;
      }

      function canToggleSelectedGroupCollapse() {
        return !!selectedNode && (isCollapsedProxyNode(selectedNode) || selectedNode.children().length > 0);
      }

      function canCreateSelectedFolderDiagram() {
        if (!selectedNode) {
          return false;
        }

        const folder = folderSelection(selectedNode);
        return !!folder && !hasFolderDiagram(folder.packageName, folder.folderPath);
      }

      function updateActionButtons() {
        hideAction.disabled = !canHideSelectedNode() && !canHideSelectedConnection();
        splitExternalDependency.disabled = !canToggleSelectedExternalDependencySplit();
        splitExternalDependency.classList.toggle('active', isSelectedExternalDependencySplit());
        collapseGroup.disabled = !canToggleSelectedGroupCollapse();
        collapseGroup.textContent = selectedNode && isCollapsedProxyNode(selectedNode) ? 'Expand' : 'Collapse';
        createFolderDiagram.disabled = !canCreateSelectedFolderDiagram();
        hiddenConnectionToggle.classList.toggle('active', hiddenConnectionState.showsHiddenConnections());
      }

      function showConfigStatus(message, isError = false) {
        layoutStatus.textContent = message;
        layoutStatus.classList.toggle('error', isError);
      }

      function updateGraph() {
        synchronizeCollapsedGroups();
        cy.elements().removeClass('faded inbound outbound hidden-by-filter search-match hidden-connection selected-connection');
        hideCollapsedGroups();

        const searchNodes = visibleSearchNodes();
        const query = search.value.trim().toLowerCase();

        if (query) {
          searchNodes.filter((node) => node.data('label').toLowerCase().includes(query)).addClass('search-match');
          cy.nodes().not(searchNodes).addClass('hidden-by-filter');
        }


        if (dependencyMode === 'none') {
          cy.edges().not('.collapsed-proxy').addClass('hidden-by-filter');
        }

        if (selectedNode) {
          const dependencyElements = visibleDependencyElements();
          cy.elements().not(dependencyElements).addClass('faded');

          if (dependencyMode !== 'both') {
            cy.elements().not(dependencyElements).addClass('hidden-by-filter');
          }

          const edges = dependencyEdges();
          edges.inbound.addClass('inbound');
          edges.outbound.addClass('outbound');
        }

        if (!showExternalDependencies) {
          cy.nodes('[externalDependency = "true"]').addClass('hidden-by-filter');
        }

        cy.edges().filter((edge) => hiddenConnectionState.isHidden(originalEdgeId(edge))).forEach((edge) => {
          if (hiddenConnectionState.showsHiddenConnections()) {
            edge.addClass('hidden-connection');
            return;
          }

          edge.addClass('hidden-by-filter');
        });

        if (selectedEdgeId) {
          cy.edges().filter((edge) => originalEdgeId(edge) === selectedEdgeId).addClass('selected-connection');
        }

        cy.edges().filter((edge) => edge.source().hasClass('hidden-by-filter') || edge.target().hasClass('hidden-by-filter')).addClass('hidden-by-filter');
        hideEmptyGroups();
        updateActionButtons();
      }


      function hideEmptyGroups() {
        const groups = cy.nodes(':parent').sort((left, right) => right.ancestors().length - left.ancestors().length);
        groups.forEach((group) => {
          const visibleChildren = group.children().filter((child) => !child.hasClass('hidden-by-filter'));
          if (visibleChildren.empty()) {
            group.addClass('hidden-by-filter');
          }
        });
      }
      function setMode(nextMode) {
        dependencyMode = nextMode;
        for (const [mode, button] of Object.entries(modeButtons)) {
          button.classList.toggle('active', mode === nextMode);
        }
        updateGraph();
      }

      function toggleExternalDependencies() {
        showExternalDependencies = !showExternalDependencies;
        externalToggle.classList.toggle('active', showExternalDependencies);
        updateGraph();
      }

      function configureAutoLayout() {
        autoLayout.configure(
          Number(layoutRows.value),
          Number(horizontalGap.value),
          Number(verticalGap.value),
          verticalLayoutEnabled,
        );
        layoutRowsValue.value = layoutRows.value;
        layoutRowsValue.textContent = layoutRows.value;
        horizontalGapValue.value = horizontalGap.value;
        horizontalGapValue.textContent = horizontalGap.value;
        verticalGapValue.value = verticalGap.value;
        verticalGapValue.textContent = verticalGap.value;
      }

      function toggleVerticalLayout() {
        verticalLayoutEnabled = !verticalLayoutEnabled;
        verticalLayout.classList.toggle('active', verticalLayoutEnabled);
        verticalLayout.setAttribute('aria-pressed', String(verticalLayoutEnabled));
        configureAutoLayout();
      }

      function applyAutoLayout() {
        configureAutoLayout();
        const selectedGroup = selectedNode && !isCollapsedProxyNode(selectedNode) && selectedNode.children().length > 0
          ? selectedNode
          : null;

        if (selectedGroup) {
          autoLayout.layoutGroup(selectedGroup);
        } else {
          collapsedGroupIds.clear();
          selectedNode = null;
          selectedEdgeId = null;
          autoLayout.layout();
        }

        layoutStore.saveSoon();
        updateGraph();
        requestAnimationFrame(fitGraph);
      }

      async function hideSelectedNode() {
        if (!canHideSelectedNode()) {
          return;
        }

        const nodeId = selectedNode.id();
        try {
          await configClient.write({ action: 'hide-node', nodeId });
          window.location.reload();
        } catch {
          showConfigStatus('Config update failed', true);
        }
      }

      async function hideSelectedAction() {
        if (canHideSelectedNode()) {
          await hideSelectedNode();
          return;
        }

        hideSelectedConnection();
      }

      async function toggleSelectedExternalDependencySplit() {
        if (!canToggleSelectedExternalDependencySplit()) {
          return;
        }

        try {
          await configClient.write({ action: 'toggle-external-dependency-split', nodeId: selectedNode.id() });
          window.location.reload();
        } catch {
          showConfigStatus('Config update failed', true);
        }
      }

      function hideSelectedConnection() {
        if (!canHideSelectedConnection()) {
          return;
        }

        hiddenConnectionState.hide(selectedEdgeId);
        selectedEdgeId = null;
        layoutStore.saveSoon();
        showConfigStatus('Layout saved with hidden connection');
        updateGraph();
      }

      function toggleHiddenConnections() {
        hiddenConnectionState.toggleVisibility();
        updateGraph();
      }

      function toggleSelectedGroupCollapse() {
        if (!canToggleSelectedGroupCollapse()) {
          return;
        }

        if (isCollapsedProxyNode(selectedNode)) {
          collapsedGroupIds.delete(selectedNode.data('collapsedGroupId'));
          selectedNode = null;
          updateGraph();
          return;
        }

        collapsedGroupIds.add(selectedNode.id());
        selectedNode = null;
        updateGraph();
      }

      async function createSelectedFolderDiagram() {
        if (!canCreateSelectedFolderDiagram()) {
          return;
        }

        const nodeId = selectedNode.id();
        const folder = folderSelection(selectedNode);
        try {
          await configClient.write({ action: 'create-folder-diagram', nodeId });
          locallyCreatedFolderDiagramKeys.add(folderDiagramKey(folder.packageName, folder.folderPath));
          showConfigStatus('Diagram and dependency matrix created');
          updateGraph();
        } catch {
          showConfigStatus('Config update failed', true);
        }
      }

      cy.on('tap', 'node', (event) => {
        event.stopPropagation();
        selectedEdgeId = null;
        selectedNode = event.target.same(selectedNode) ? null : event.target;
        updateGraph();
      });
      cy.on('tap', 'edge', (event) => {
        event.stopPropagation();
        const edgeId = originalEdgeId(event.target);
        selectedNode = null;
        selectedEdgeId = edgeId === selectedEdgeId ? null : edgeId;
        updateGraph();
      });
      cy.on('tap', (event) => {
        if (event.target === cy) {
          selectedNode = null;
          selectedEdgeId = null;
          updateGraph();
        }
      });
      document.querySelectorAll('.navigation-link').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          void layoutStore.flushPendingSave().finally(() => {
            window.location.href = link.href;
          });
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          void layoutStore.flushPendingSave();
        }
      });
      search.addEventListener('input', updateGraph);
      modeButtons.both.addEventListener('click', () => setMode('both'));
      modeButtons.inbound.addEventListener('click', () => setMode('inbound'));
      modeButtons.outbound.addEventListener('click', () => setMode('outbound'));
      modeButtons.none.addEventListener('click', () => setMode('none'));
      externalToggle.addEventListener('click', toggleExternalDependencies);
      autoLayoutButton.addEventListener('click', applyAutoLayout);
      verticalLayout.addEventListener('click', toggleVerticalLayout);
      hideAction.addEventListener('click', () => void hideSelectedAction());
      splitExternalDependency.addEventListener('click', () => void toggleSelectedExternalDependencySplit());
      hiddenConnectionToggle.addEventListener('click', toggleHiddenConnections);
      collapseGroup.addEventListener('click', toggleSelectedGroupCollapse);
      createFolderDiagram.addEventListener('click', () => void createSelectedFolderDiagram());
      layoutRows.addEventListener('input', configureAutoLayout);
      horizontalGap.addEventListener('input', configureAutoLayout);
      verticalGap.addEventListener('input', configureAutoLayout);
      snapGrid.addEventListener('input', () => {
        snapGridValue.value = snapGrid.value;
        snapGridValue.textContent = snapGrid.value;
      });
      snapDiagram.addEventListener('click', () => {
        gridSnapper.snap(Number(snapGrid.value), selectedNode);
        layoutStore.saveSoon();
        updateGraph();
      });
      darkModeToggle.addEventListener('click', toggleDarkMode);
      fitDiagram.addEventListener('click', fitGraph);
      exportDiagramImage.addEventListener('click', () => void imageExporter.export());
      exportAllDiagramImages.addEventListener('click', () => void allImagesExporter.export());
      configureAutoLayout();
      loadDarkModePreference();
      applyDiagramTheme();
      cy.on('dragfree', 'node', (event) => {
        if (!event.target.hasClass('collapsed-proxy')) {
          layoutStore.saveSoon();
        }
      });
    </script>
  </body>
</html>
`;
  }

  private renderNavigation(
    pages: ArchitecturePage[],
    currentPath: string,
    basePath: string,
  ): string {
    return pages
      .map((page) => {
        const children = page.children?.length
          ? `<div class="navigation-children">${this.renderNavigation(page.children, currentPath, basePath)}</div>`
          : '';
        const item = page.htmlPath
          ? `<a class="navigation-link${page.htmlPath === currentPath ? ' current' : ''}" href="${relative(basePath, page.htmlPath).replaceAll('\\', '/')}">${page.title}</a>`
          : `<div class="navigation-group-title">${page.title}</div>`;
        return `<div class="navigation-item">${item}${children}</div>`;
      })
      .join('\n          ');
  }

  private diagramPagePaths(
    pages: ArchitecturePage[],
    basePath: string,
  ): string[] {
    return pages.flatMap((page) => {
      const pagePath = page.htmlPath?.endsWith('.cytoscape.html')
        ? [relative(basePath, page.htmlPath).replaceAll('\\', '/')]
        : [];
      return [...pagePath, ...this.diagramPagePaths(page.children ?? [], basePath)];
    });
  }
}
