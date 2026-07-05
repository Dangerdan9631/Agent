import { writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';

/**
 * Defines the rendered graph label font size in pixels for architecture diagrams.
 */
const ARCHITECTURE_LABEL_FONT_SIZE = 25;

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
    const pageLinks = pages.map((page) => ({
      title: page.title,
      href: relative(dirname(cytoscapeHtmlPath), page.htmlPath).replaceAll(
        '\\',
        '/',
      ),
      isCurrent: page.htmlPath === cytoscapeHtmlPath,
    }));

    writeFileSync(cytoscapeJsonPath, `${JSON.stringify(elements, null, 2)}\n`);
    writeFileSync(cytoscapeHtmlPath, this.renderHtml(elements, pageLinks));
  }

  private renderHtml(
    elements: CytoscapeElement[],
    pageLinks: Array<{ title: string; href: string; isCurrent: boolean }>,
  ): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>spec-n-roll dependency graph</title>
    <script src="https://unpkg.com/cytoscape@3.31.2/dist/cytoscape.min.js"></script>
    <script src="https://unpkg.com/cytoscape-fcose@2.2.0/cytoscape-fcose.js"></script>
    <style>
      html, body { height: 100%; margin: 0; }
      body { color: #111827; font-family: Arial, sans-serif; overflow: hidden; }
      .shell { display: grid; grid-template-columns: 280px 1fr; height: 100%; min-width: 0; transition: grid-template-columns 160ms ease; }
      .shell.nav-collapsed { grid-template-columns: 44px 1fr; }
      .navigation { background: #f8fafc; border-right: 1px solid #d1d5db; min-width: 0; overflow: hidden; }
      .navigation-header { align-items: center; display: flex; gap: 8px; height: 44px; padding: 0 8px; }
      .nav-toggle { align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #111827; cursor: pointer; display: inline-flex; height: 28px; justify-content: center; width: 28px; }
      .navigation-title { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .navigation-links { display: flex; flex-direction: column; gap: 4px; padding: 0 8px 12px; }
      .nav-collapsed .navigation-title, .nav-collapsed .navigation-links { display: none; }
      .navigation-link { border-radius: 6px; color: #334155; font-size: 13px; line-height: 1.3; padding: 8px 10px; text-decoration: none; }
      .navigation-link:hover { background: #e2e8f0; color: #0f172a; }
      .navigation-link.current { background: #dbeafe; color: #1d4ed8; font-weight: 700; }
      .workspace { display: grid; grid-template-rows: auto 1fr; min-height: 0; min-width: 0; }
      .toolbar { align-items: center; border-bottom: 1px solid #d1d5db; display: flex; flex-wrap: wrap; gap: 8px; min-height: 44px; padding: 6px 10px; }
      .search-input { border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; height: 30px; min-width: 220px; padding: 0 10px; }
      .toolbar-button { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #111827; cursor: pointer; font-size: 13px; height: 30px; padding: 0 10px; }
      .toolbar-button.active { background: #1d4ed8; border-color: #1d4ed8; color: #ffffff; }
      #cy { height: 100%; min-height: 0; min-width: 0; width: 100%; }
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
          ${pageLinks.map((page) => this.renderPageLink(page)).join('\n          ')}
        </div>
      </nav>
      <main class="workspace">
        <div class="toolbar" aria-label="Graph controls">
          <input class="search-input" id="search" type="search" placeholder="Search nodes" />
          <button class="toolbar-button active" id="filter-both" type="button">Both</button>
          <button class="toolbar-button" id="filter-inbound" type="button">Inbound</button>
          <button class="toolbar-button" id="filter-outbound" type="button">Outbound</button>
          <button class="toolbar-button active" id="toggle-external" type="button">External</button>
        </div>
        <div id="cy"></div>
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
          { selector: 'edge', style: { width: 2, 'line-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'curve-style': 'bezier' } },
          { selector: '.faded', style: { opacity: 0.12 } },
          { selector: 'edge.inbound', style: { 'line-color': '#16a34a', 'target-arrow-color': '#16a34a', width: 4 } },
          { selector: 'edge.outbound', style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb', width: 4 } },
          { selector: '.hidden-by-filter', style: { display: 'none' } },
          { selector: 'node.search-match', style: { 'border-color': '#f59e0b', 'border-width': 4 } }
        ]
      });

      const BASE_WHEEL_SENSITIVITY = 0.5;
      const WHEEL_ZOOM_EXPONENT = 0.001;
      const FIT_PADDING = 36;
      const preferredLayout = { name: 'fcose', quality: 'proof', randomize: false, animate: false, padding: FIT_PADDING, nodeSeparation: 90, idealEdgeLength: 120 };
      const fallbackLayout = { name: 'cose', randomize: false, animate: false, padding: FIT_PADDING, idealEdgeLength: 120 };

      function runLayout() {
        try {
          cy.layout(preferredLayout).run();
        } catch {
          cy.layout(fallbackLayout).run();
        }
      }

      function fitGraph() {
        cy.resize();
        cy.fit(undefined, FIT_PADDING);
      }

      runLayout();
      requestAnimationFrame(fitGraph);

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
        const dynamicSensitivity = BASE_WHEEL_SENSITIVITY / zoom;
        const factor = Math.pow(10, -deltaY * WHEEL_ZOOM_EXPONENT * dynamicSensitivity);

        cy.zoom({
          level: Math.min(cy.maxZoom(), Math.max(cy.minZoom(), zoom * factor)),
          renderedPosition: { x: event.clientX, y: event.clientY },
        });
      }, { passive: false });

      let selectedNode = null;
      let dependencyMode = 'both';
      let showExternalDependencies = true;

      const shell = document.getElementById('shell');
      const search = document.getElementById('search');
      const modeButtons = {
        both: document.getElementById('filter-both'),
        inbound: document.getElementById('filter-inbound'),
        outbound: document.getElementById('filter-outbound')
      };
      const externalToggle = document.getElementById('toggle-external');

      document.getElementById('nav-toggle').addEventListener('click', () => {
        shell.classList.toggle('nav-collapsed');
        cy.resize();
        cy.fit(undefined, 24);
      });

      function selectedScope() {
        if (!selectedNode) {
          return cy.collection();
        }

        return selectedNode.union(selectedNode.descendants());
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

      function updateGraph() {
        cy.elements().removeClass('faded inbound outbound hidden-by-filter search-match');

        const searchNodes = visibleSearchNodes();
        const query = search.value.trim().toLowerCase();

        if (query) {
          searchNodes.filter((node) => node.data('label').toLowerCase().includes(query)).addClass('search-match');
          cy.nodes().not(searchNodes).addClass('hidden-by-filter');
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

        cy.edges().filter((edge) => edge.source().hasClass('hidden-by-filter') || edge.target().hasClass('hidden-by-filter')).addClass('hidden-by-filter');
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

      cy.on('tap', 'node', (event) => {
        selectedNode = event.target.same(selectedNode) ? null : event.target;
        updateGraph();
      });
      cy.on('tap', (event) => {
        if (event.target === cy) {
          selectedNode = null;
          updateGraph();
        }
      });
      search.addEventListener('input', updateGraph);
      modeButtons.both.addEventListener('click', () => setMode('both'));
      modeButtons.inbound.addEventListener('click', () => setMode('inbound'));
      modeButtons.outbound.addEventListener('click', () => setMode('outbound'));
      externalToggle.addEventListener('click', toggleExternalDependencies);
    </script>
  </body>
</html>
`;
  }

  private renderPageLink(page: {
    title: string;
    href: string;
    isCurrent: boolean;
  }): string {
    return `<a class="navigation-link${page.isCurrent ? ' current' : ''}" href="${page.href}">${page.title}</a>`;
  }
}
