import { writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { ArchitecturePage } from '#arch/application/graph/architecture-page.js';
import { DependencyMatrix } from '#arch/application/graph/dependency-matrix.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
import { ArchitectureViewerDarkModeScript } from '#arch/infrastructure/cytoscape/architecture-viewer-dark-mode-script.js';

/**
 * Writes browser-renderable dependency matrix artifacts to disk.
 */
export class DependencyMatrixArtifactWriter {
  /**
   * Writes an HTML dependency matrix page for Cytoscape graph elements.
   *
   * @param matrixHtmlPath - Absolute destination path for the HTML matrix artifact.
   * @param elements - Cytoscape graph elements used to derive declaration dependencies.
   * @param pages - Generated HTML pages to show in the navigation pane.
   */
  write(
    matrixHtmlPath: string,
    elements: CytoscapeElement[],
    pages: ArchitecturePage[] = [
      { title: 'Dependency matrix', htmlPath: matrixHtmlPath },
    ],
  ): void {
    writeFileSync(
      matrixHtmlPath,
      this.renderHtml(DependencyMatrix.fromElements(elements), pages, matrixHtmlPath),
    );
  }

  private renderHtml(
    matrix: DependencyMatrix,
    pages: ArchitecturePage[],
    currentPath: string,
  ): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>spec-n-roll dependency matrix</title>
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
      .workspace { display: grid; grid-template-rows: auto 1fr; min-height: 0; min-width: 0; }
      .summary { align-items: center; border-bottom: 1px solid #d1d5db; display: flex; flex-wrap: wrap; gap: 10px; min-height: 44px; padding: 8px 10px; }
      .metric { background: #f8fafc; border: 1px solid #d1d5db; border-radius: 6px; display: grid; gap: 2px; min-width: 110px; padding: 6px 8px; }
      .metric-label { color: #64748b; font-size: 11px; line-height: 1.1; }
      .metric-value { color: #111827; font-size: 14px; font-weight: 700; line-height: 1.1; }
      .matrix-scroll { overflow: auto; min-height: 0; min-width: 0; }
      table { border-collapse: separate; border-spacing: 0; font-size: 12px; width: max-content; }
      th, td { border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; height: 38px; min-width: 30px; padding: 0; text-align: center; }
      th { color: #334155; font-weight: 700; position: sticky; z-index: 1; }
      thead th { top: 0; vertical-align: bottom; }
      tbody th { left: 0; max-width: 360px; min-width: 280px; padding: 0 10px; text-align: left; z-index: 2; }
      tbody tr.row-folder-even th { background: #ffffff; box-shadow: inset 6px 0 0 #14b8a6; }
      tbody tr.row-folder-odd th { background: #f8fafc; box-shadow: inset 6px 0 0 #f59e0b; }
      thead th:first-child { background: #f8fafc; left: 0; min-width: 280px; z-index: 3; }
      thead th.matrix-column { height: 190px; max-width: 30px; min-width: 30px; overflow: hidden; position: sticky; width: 30px; }
      thead th.column-even { background: #f8fafc; }
      thead th.column-odd { background: #eef2ff; }
      thead th.column-folder-odd { box-shadow: inset 4px 0 0 #f59e0b; }
      thead th.column-folder-even { box-shadow: inset 4px 0 0 #14b8a6; }
      .row-label, .column-label { align-items: flex-start; display: flex; flex-direction: column; gap: 2px; line-height: 1.15; overflow: hidden; text-align: left; }
      .row-label { max-width: 330px; width: 330px; }
      .column-label { bottom: 76px; left: 50%; max-width: 160px; position: absolute; transform: translateX(-50%) rotate(-90deg); transform-origin: center; width: 160px; }
      .row-file-name, .row-folder-path, .column-file-name, .column-folder-path { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .row-file-name, .row-folder-path { max-width: 330px; }
      .column-file-name, .column-folder-path { max-width: 160px; }
      .row-file-name, .column-file-name { color: #111827; font-size: 12px; }
      .row-folder-path, .column-folder-path { color: #64748b; font-size: 10px; font-weight: 600; }
      .folder-row-boundary th, .folder-row-boundary td { border-top: 2px solid #94a3b8; }
      .package-row-boundary th, .package-row-boundary td { border-top: 3px solid #334155; }
      .folder-column-boundary { border-left: 2px solid #94a3b8; }
      .package-column-boundary { border-left: 3px solid #334155; }
      td.matrix-cell { --column-overlay: transparent; --dependency-overlay: transparent; --folder-column-overlay: transparent; --folder-row-overlay: transparent; --row-background: #ffffff; background: linear-gradient(var(--dependency-overlay), var(--dependency-overlay)), linear-gradient(var(--folder-column-overlay), var(--folder-column-overlay)), linear-gradient(var(--folder-row-overlay), var(--folder-row-overlay)), linear-gradient(var(--column-overlay), var(--column-overlay)), var(--row-background); max-width: 30px; min-width: 30px; width: 30px; }
      td.column-odd { --column-overlay: rgba(37, 99, 235, 0.05); }
      td.column-even { --column-overlay: rgba(20, 184, 166, 0.03); }
      td.row-folder-even { --row-background: #ffffff; --folder-row-overlay: rgba(20, 184, 166, 0.035); }
      td.row-folder-odd { --row-background: #f8fafc; --folder-row-overlay: rgba(245, 158, 11, 0.06); }
      td.column-folder-odd { --folder-column-overlay: rgba(245, 158, 11, 0.06); }
      td.column-folder-even { --folder-column-overlay: rgba(20, 184, 166, 0.035); }
      td.has-dependency { --dependency-overlay: rgba(37, 99, 235, 0.88); color: #ffffff; font-weight: 700; }
      td.self:not(.has-dependency) { --dependency-overlay: rgba(100, 116, 139, 0.18); color: transparent; }
      .empty-state { color: #64748b; font-size: 14px; padding: 24px; }
      .theme-toggle { margin-left: auto; }
      .toolbar-button { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #111827; cursor: pointer; font-size: 13px; height: 30px; padding: 0 10px; }
      .toolbar-button.active { background: #6d28d9; border-color: #6d28d9; color: #ffffff; }
      .dark-mode .navigation, .dark-mode thead th:first-child, .dark-mode thead th.column-even, .dark-mode tbody tr.row-folder-odd th { background: #111827; }
      .dark-mode .navigation { border-right-color: #334155; }
      .dark-mode .nav-toggle, .dark-mode .toolbar-button { background: #1f2937; border-color: #475569; color: #e5e7eb; }
      .dark-mode .navigation-link { color: #cbd5e1; }
      .dark-mode .navigation-group-title { color: #e5e7eb; }
      .dark-mode .navigation-link:hover { background: #334155; color: #f8fafc; }
      .dark-mode .navigation-link.current, .dark-mode .toolbar-button.active { background: #6d28d9; border-color: #6d28d9; color: #ffffff; }
      .dark-mode .summary { background: #0f172a; border-bottom-color: #334155; }
      .dark-mode .metric { background: #111827; border-color: #334155; }
      .dark-mode .metric-label, .dark-mode .row-folder-path, .dark-mode .column-folder-path, .dark-mode .empty-state { color: #94a3b8; }
      .dark-mode .metric-value, .dark-mode .row-file-name, .dark-mode .column-file-name, .dark-mode th { color: #e5e7eb; }
      .dark-mode th, .dark-mode td { border-bottom-color: #334155; border-right-color: #334155; }
      .dark-mode tbody tr.row-folder-even th, .dark-mode td.row-folder-even { background: #0f172a; }
      .dark-mode thead th.column-odd, .dark-mode td.row-folder-odd { background: #1e1b4b; }
      .dark-mode td.matrix-cell { --row-background: #0f172a; }
      .dark-mode td.column-odd { --column-overlay: rgba(129, 140, 248, 0.08); }
      .dark-mode td.column-even { --column-overlay: rgba(45, 212, 191, 0.05); }
      .dark-mode td.row-folder-even { --folder-row-overlay: rgba(45, 212, 191, 0.05); }
      .dark-mode td.row-folder-odd { --row-background: #111827; --folder-row-overlay: rgba(251, 191, 36, 0.08); }
      .dark-mode td.has-dependency { --dependency-overlay: rgba(124, 58, 237, 0.9); }
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
        <div class="summary" aria-label="Dependency graph metrics">
          ${this.renderMetrics(matrix)}
          <button class="toolbar-button theme-toggle" id="toggle-dark-mode" type="button">Dark Mode</button>
        </div>
        <div class="matrix-scroll">
          ${this.renderMatrix(matrix)}
        </div>
      </main>
    </div>
    <script>
      const shell = document.getElementById('shell');
      const darkModeToggle = document.getElementById('toggle-dark-mode');
      ${ArchitectureViewerDarkModeScript.render()}
      document.getElementById('nav-toggle').addEventListener('click', () => {
        shell.classList.toggle('nav-collapsed');
      });
      darkModeToggle.addEventListener('click', () => {
        setDarkMode(!isDarkModeEnabled());
        saveDarkModePreference();
      });
      loadDarkModePreference();
    </script>
  </body>
</html>
`;
  }

  private renderMetrics(matrix: DependencyMatrix): string {
    return [
      this.renderMetric('Declarations', matrix.metrics.fileCount.toString()),
      this.renderMetric(
        'Dependencies',
        matrix.metrics.dependencyCount.toString(),
      ),
      this.renderMetric('Density', this.formatRatio(matrix.metrics.density)),
      this.renderMetric(
        'Avg outbound',
        matrix.metrics.averageOutboundDependencies.toFixed(2),
      ),
      this.renderMetric(
        'Max outbound',
        matrix.metrics.maximumOutboundDependencies.toString(),
      ),
      this.renderMetric(
        'Max inbound',
        matrix.metrics.maximumInboundDependencies.toString(),
      ),
      this.renderMetric(
        'Isolated',
        matrix.metrics.isolatedFileCount.toString(),
      ),
      this.renderMetric(
        'Cycle groups',
        matrix.metrics.cycleGroupCount.toString(),
      ),
    ].join('\n          ');
  }

  private renderMetric(label: string, value: string): string {
    return `<div class="metric"><span class="metric-label">${this.escapeHtml(label)}</span><span class="metric-value">${this.escapeHtml(value)}</span></div>`;
  }

  private renderMatrix(matrix: DependencyMatrix): string {
    if (matrix.files.length === 0) {
      return '<div class="empty-state">No declaration dependencies were found for this graph.</div>';
    }

    const folderBands = this.folderBands(matrix.files);

    return `<table aria-label="Dependency matrix">
            <thead>
              <tr>
                <th scope="col">Declaration</th>
                ${matrix.files.map((file, index) => this.renderColumnHeader(file, index, folderBands.get(file) ?? 0, this.boundaryClass(file, index, matrix.files, 'column'))).join('\n                ')}
              </tr>
            </thead>
            <tbody>
              ${matrix.files.map((file, index) => this.renderRow(file, index, matrix, folderBands)).join('\n              ')}
            </tbody>
          </table>`;
  }

  private renderColumnHeader(
    file: string,
    index: number,
    folderBand: number,
    boundaryClass: string,
  ): string {
    const label = this.headerLabel(file);

    return `<th class="matrix-column ${this.columnClass(index)} ${this.columnFolderClass(folderBand)} ${boundaryClass}" scope="col" title="${this.escapeHtml(file)}"><span class="column-label"><span class="column-file-name">${this.escapeHtml(label.fileName)}</span><span class="column-folder-path">${this.escapeHtml(label.folderPath)}</span></span></th>`;
  }

  private renderRow(
    file: string,
    index: number,
    matrix: DependencyMatrix,
    folderBands: ReadonlyMap<string, number>,
  ): string {
    const rowFolderClass = this.rowFolderClass(folderBands.get(file) ?? 0);
    const rowBoundaryClass = this.boundaryClass(
      file,
      index,
      matrix.files,
      'row',
    );
    const label = this.headerLabel(file);

    return `<tr class="${rowFolderClass} ${rowBoundaryClass}">
                <th scope="row" title="${this.escapeHtml(file)}"><span class="row-label"><span class="row-file-name">${this.escapeHtml(label.fileName)}</span><span class="row-folder-path">${this.escapeHtml(label.folderPath)}</span></span></th>
                ${matrix.files.map((target, columnIndex) => this.renderCell(file, target, matrix, columnIndex, rowFolderClass, this.columnFolderClass(folderBands.get(target) ?? 0), this.boundaryClass(target, columnIndex, matrix.files, 'column'))).join('\n                ')}
              </tr>`;
  }

  private renderCell(
    source: string,
    target: string,
    matrix: DependencyMatrix,
    columnIndex: number,
    rowFolderClass: string,
    columnFolderClass: string,
    columnBoundaryClass: string,
  ): string {
    const relationshipTypes = matrix.relationshipTypes(source, target);
    const hasDependency = relationshipTypes.length > 0;
    const classes = [
      'matrix-cell',
      this.columnClass(columnIndex),
      rowFolderClass,
      columnFolderClass,
      columnBoundaryClass,
      hasDependency ? 'has-dependency' : '',
      source === target ? 'self' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const relationshipLabel = relationshipTypes.length === 2 ? 'reference and inheritance' : relationshipTypes[0] ?? 'no relationship';
    const label = hasDependency
      ? `${source} has ${relationshipLabel} relationship to ${target}`
      : `${source} does not depend on ${target}`;

    const cellLabel = relationshipTypes.length === 2 ? 'R+I' : relationshipTypes[0] === 'inheritance' ? 'I' : relationshipTypes[0] === 'reference' ? 'R' : '';
    return `<td class="${classes}" title="${this.escapeHtml(label)}">${cellLabel}</td>`;
  }

  private headerLabel(file: string): { fileName: string; folderPath: string } {
    const segments = this.pathSegments(file);
    const fileName = segments.pop() ?? file;

    return {
      fileName,
      folderPath: segments.join('/') || '.',
    };
  }

  private folderBands(files: string[]): ReadonlyMap<string, number> {
    const bands = new Map<string, number>();
    let currentFolder = '';
    let currentBand = -1;

    for (const file of files) {
      const folder = this.folderPath(file);
      if (folder !== currentFolder) {
        currentFolder = folder;
        currentBand += 1;
      }
      bands.set(file, currentBand);
    }

    return bands;
  }

  private boundaryClass(
    file: string,
    index: number,
    files: string[],
    axis: 'row' | 'column',
  ): string {
    if (index === 0) {
      return '';
    }

    const previousFile = files[index - 1];
    if (this.packagePath(file) !== this.packagePath(previousFile)) {
      return axis === 'row'
        ? 'package-row-boundary'
        : 'package-column-boundary';
    }

    if (this.folderPath(file) !== this.folderPath(previousFile)) {
      return axis === 'row' ? 'folder-row-boundary' : 'folder-column-boundary';
    }

    return '';
  }

  private packagePath(file: string): string {
    const segments = this.pathSegments(file);

    return segments[0] === 'src' && segments[1]
      ? `${segments[0]}/${segments[1]}`
      : (segments[0] ?? file);
  }

  private folderPath(file: string): string {
    const segments = this.pathSegments(file);
    segments.pop();

    return segments.join('/');
  }

  private pathSegments(file: string): string[] {
    return file.replaceAll('\\', '/').split('/');
  }

  private columnClass(index: number): string {
    return index % 2 === 0 ? 'column-even' : 'column-odd';
  }

  private rowFolderClass(folderBand: number): string {
    return folderBand % 2 === 0 ? 'row-folder-even' : 'row-folder-odd';
  }

  private columnFolderClass(folderBand: number): string {
    return folderBand % 2 === 0 ? 'column-folder-even' : 'column-folder-odd';
  }

  private renderNavigation(
    pages: ArchitecturePage[],
    currentPath: string,
    basePath: string,
  ): string {
    return pages.map((page) => {
      const children = page.children?.length
        ? `<div class="navigation-children">${this.renderNavigation(page.children, currentPath, basePath)}</div>`
        : '';
      const item = page.htmlPath
        ? `<a class="navigation-link${page.htmlPath === currentPath ? ' current' : ''}" href="${this.escapeHtml(relative(basePath, page.htmlPath).replaceAll('\\', '/'))}">${this.escapeHtml(page.title)}</a>`
        : `<div class="navigation-group-title">${this.escapeHtml(page.title)}</div>`;
      return `<div class="navigation-item">${item}${children}</div>`;
    }).join('\n          ');
  }

  private formatRatio(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
