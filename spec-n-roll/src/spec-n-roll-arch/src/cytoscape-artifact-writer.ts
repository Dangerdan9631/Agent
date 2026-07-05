import { writeFileSync } from 'node:fs';
import type { CytoscapeElement } from '#arch/cytoscape-element.js';

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
   */
  write(
    cytoscapeJsonPath: string,
    cytoscapeHtmlPath: string,
    elements: CytoscapeElement[],
  ): void {
    writeFileSync(cytoscapeJsonPath, `${JSON.stringify(elements, null, 2)}\n`);
    writeFileSync(
      cytoscapeHtmlPath,
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>spec-n-roll dependency graph</title>
    <script src="https://unpkg.com/cytoscape@3.31.2/dist/cytoscape.min.js"></script>
    <style>
      html, body, #cy { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="cy"></div>
    <script>
      cytoscape({
        container: document.getElementById('cy'),
        elements: ${JSON.stringify(elements)},
        style: [
          { selector: 'node', style: { label: 'data(label)', 'background-color': '#3b82f6', color: '#111827' } },
          { selector: 'edge', style: { width: 2, 'line-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'curve-style': 'bezier' } }
        ],
        layout: { name: 'breadthfirst', directed: true, padding: 24 }
      });
    </script>
  </body>
</html>
`,
    );
  }
}
