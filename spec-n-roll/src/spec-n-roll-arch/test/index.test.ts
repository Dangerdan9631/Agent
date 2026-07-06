import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
import { ArchitectureViewerHttpServer } from '#arch/infrastructure/http/architecture-viewer-http-server.js';
import { DependencyCruiserCytoscapeConverter } from '#arch/application/graph/dependency-cruiser-cytoscape-converter.js';
import { PackageFolderArchitectureArtifactGenerator } from '#arch/application/artifacts/package-folder-architecture-artifact-generator.js';
import { PackageDependencyCytoscapeConverter } from '#arch/application/graph/package-dependency-cytoscape-converter.js';
import { PackageFolderDependencyCytoscapeConverter } from '#arch/application/graph/package-folder-dependency-cytoscape-converter.js';
import { PackagePublicApiExportIndex } from '#arch/application/graph/package-public-api-export-index.js';
import { RuntimePackageDiscoverer } from '#arch/index.js';

describe('spec-n-roll-arch', () => {
  it('discovers runtime packages and excludes arch and test packages', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'spec-n-roll-arch-'));
    const sourceRoot = join(workspaceRoot, 'src');
    mkdirSync(sourceRoot);

    for (const packageName of [
      'spec-n-roll',
      'spec-n-roll-arch',
      'spec-n-roll-test',
    ]) {
      const packageRoot = join(sourceRoot, packageName);
      mkdirSync(packageRoot);
      writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: packageName, dependencies: {} }),
      );
    }

    expect(
      new RuntimePackageDiscoverer()
        .discover(workspaceRoot)
        .map((workspacePackage) => workspacePackage.name),
    ).toEqual(['spec-n-roll']);
  });

  it('groups project dependencies by package and resolves index re-exports to source files', () => {
    const packages = [
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: { beta: '0.1.0' },
      },
      {
        name: 'beta',
        root: 'D:/repo/src/beta',
        dependencies: {},
      },
    ];
    const reports = new Map([
      [
        'alpha',
        JSON.stringify({
          modules: [
            {
              source: 'src/alpha/src/internal.ts',
              dependencies: [
                {
                  module: 'src/alpha/src/other.ts',
                  resolved: 'src/alpha/src/other.ts',
                },
              ],
            },
            {
              source: 'src/alpha/src/uses-beta.ts',
              dependencies: [{ module: 'beta', resolved: 'beta' }],
            },
          ],
        }),
      ],
      ['beta', JSON.stringify({ modules: [] })],
    ]);

    const elements = new PackageDependencyCytoscapeConverter().convert(
      packages,
      reports,
      undefined,
      new Map([
        [
          'src/alpha/src/uses-beta.ts',
          "import type { BetaThing } from 'beta';",
        ],
      ]),
      new PackagePublicApiExportIndex([
        {
          package: packages[1],
          sourceText:
            "export type { BetaThing } from '#beta/contracts/beta-thing.js';",
        },
      ]),
    );

    expect(elements).toEqual([
      { data: { id: 'alpha', label: 'alpha' } },
      { data: { id: 'beta', label: 'beta' } },
      {
        data: {
          id: 'directory:beta:contracts',
          label: 'contracts',
          parent: 'beta',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-beta.ts',
          label: 'uses-beta',
          parent: 'alpha',
        },
      },
      {
        data: {
          id: 'src/beta/src/contracts/beta-thing.ts',
          label: 'beta-thing',
          parent: 'directory:beta:contracts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-beta.ts->src/beta/src/contracts/beta-thing.ts',
          source: 'src/alpha/src/uses-beta.ts',
          target: 'src/beta/src/contracts/beta-thing.ts',
        },
      },
    ]);
  });

  it('resolves multiple named package imports to their backing source files', () => {
    const packages = [
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: { beta: '0.1.0' },
      },
      {
        name: 'beta',
        root: 'D:/repo/src/beta',
        dependencies: {},
      },
    ];
    const reports = new Map([
      [
        'alpha',
        JSON.stringify({
          modules: [
            {
              source: 'src/alpha/src/uses-beta.ts',
              dependencies: [{ module: 'beta', resolved: 'beta' }],
            },
          ],
        }),
      ],
      ['beta', JSON.stringify({ modules: [] })],
    ]);

    const elements = new PackageDependencyCytoscapeConverter().convert(
      packages,
      reports,
      undefined,
      new Map([
        [
          'src/alpha/src/uses-beta.ts',
          "import type { FirstThing, SecondThing } from 'beta';",
        ],
      ]),
      new PackagePublicApiExportIndex([
        {
          package: packages[1],
          sourceText: [
            "export type { FirstThing } from '#beta/contracts/first-thing.js';",
            "export type { SecondThing } from '#beta/contracts/second-thing.js';",
          ].join('\n'),
        },
      ]),
    );

    expect(elements).toEqual([
      { data: { id: 'alpha', label: 'alpha' } },
      { data: { id: 'beta', label: 'beta' } },
      {
        data: {
          id: 'directory:beta:contracts',
          label: 'contracts',
          parent: 'beta',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-beta.ts',
          label: 'uses-beta',
          parent: 'alpha',
        },
      },
      {
        data: {
          id: 'src/beta/src/contracts/first-thing.ts',
          label: 'first-thing',
          parent: 'directory:beta:contracts',
        },
      },
      {
        data: {
          id: 'src/beta/src/contracts/second-thing.ts',
          label: 'second-thing',
          parent: 'directory:beta:contracts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-beta.ts->src/beta/src/contracts/first-thing.ts',
          source: 'src/alpha/src/uses-beta.ts',
          target: 'src/beta/src/contracts/first-thing.ts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-beta.ts->src/beta/src/contracts/second-thing.ts',
          source: 'src/alpha/src/uses-beta.ts',
          target: 'src/beta/src/contracts/second-thing.ts',
        },
      },
    ]);
  });

  it('collapses external dependencies to package nodes', () => {
    const elements = new DependencyCruiserCytoscapeConverter().convert(
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/uses-external.ts',
            dependencies: [
              {
                module: 'tslog',
                resolved: 'node_modules/tslog/cjs/index.js',
                coreModule: false,
              },
              {
                module: 'node:path',
                resolved: 'path',
                coreModule: true,
              },
            ],
          },
          {
            source: 'node_modules/tslog/cjs/index.js',
            dependencies: [
              {
                module: 'node:util',
                resolved: 'util',
                coreModule: true,
              },
            ],
          },
        ],
      }),
    );

    expect(elements).toEqual([
      {
        data: {
          id: 'src/alpha/src/uses-external.ts',
          label: 'uses-external',
        },
      },
      {
        data: {
          id: 'external:tslog',
          label: 'tslog',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'external:node:path',
          label: 'node:path',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-external.ts->external:tslog',
          source: 'src/alpha/src/uses-external.ts',
          target: 'external:tslog',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-external.ts->external:node:path',
          source: 'src/alpha/src/uses-external.ts',
          target: 'external:node:path',
        },
      },
    ]);
  });

  it('excludes configured external dependencies and package files from package graphs', () => {
    const elements = new DependencyCruiserCytoscapeConverter().convert(
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/keep.ts',
            dependencies: [
              {
                module: 'tslog',
                resolved: 'node_modules/tslog/cjs/index.js',
                coreModule: false,
              },
              {
                module: 'src/alpha/src/skip.ts',
                resolved: 'src/alpha/src/skip.ts',
                coreModule: false,
              },
            ],
          },
          {
            source: 'src/alpha/src/skip.ts',
            dependencies: [],
          },
          {
            source: 'src/alpha/src/nested/ignored.test.ts',
            dependencies: [],
          },
        ],
      }),
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: {},
      },
      new ArchitectureExclusionFilter({
        exclusions: {
          externalDependencies: ['tslog'],
          projectFiles: {
            allPackages: ['src/**/*.test.ts'],
            packages: {
              alpha: ['skip.ts'],
            },
          },
        },
      }),
    );

    expect(elements).toEqual([
      {
        data: {
          id: 'src/alpha/src/keep.ts',
          label: 'keep',
        },
      },
    ]);
  });

  it('includes external dependencies in project dependency graphs', () => {
    const packages = [
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: {},
      },
    ];
    const reports = new Map([
      [
        'alpha',
        JSON.stringify({
          modules: [
            {
              source: 'src/alpha/src/uses-external.ts',
              dependencies: [
                {
                  module: 'tslog',
                  resolved: 'node_modules/tslog/cjs/index.js',
                  coreModule: false,
                },
              ],
            },
          ],
        }),
      ],
    ]);

    const elements = new PackageDependencyCytoscapeConverter().convert(
      packages,
      reports,
    );

    expect(elements).toEqual([
      { data: { id: 'alpha', label: 'alpha' } },
      {
        data: {
          id: 'src/alpha/src/uses-external.ts',
          label: 'uses-external',
          parent: 'alpha',
        },
      },
      {
        data: {
          id: 'external:tslog',
          label: 'tslog',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'src/alpha/src/uses-external.ts->external:tslog',
          source: 'src/alpha/src/uses-external.ts',
          target: 'external:tslog',
        },
      },
    ]);
  });

  it('excludes configured external dependencies from project dependency graphs', () => {
    const packages = [
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: {},
      },
    ];
    const reports = new Map([
      [
        'alpha',
        JSON.stringify({
          modules: [
            {
              source: 'src/alpha/src/uses-external.ts',
              dependencies: [
                {
                  module: 'tslog',
                  resolved: 'node_modules/tslog/cjs/index.js',
                  coreModule: false,
                },
              ],
            },
          ],
        }),
      ],
    ]);

    const elements = new PackageDependencyCytoscapeConverter().convert(
      packages,
      reports,
      new ArchitectureExclusionFilter({
        exclusions: {
          externalDependencies: ['tslog'],
        },
      }),
    );

    expect(elements).toEqual([{ data: { id: 'alpha', label: 'alpha' } }]);
  });

  it('excludes configured project files from project dependency graphs', () => {
    const packages = [
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: { beta: '0.1.0' },
      },
      {
        name: 'beta',
        root: 'D:/repo/src/beta',
        dependencies: {},
      },
    ];
    const reports = new Map([
      [
        'alpha',
        JSON.stringify({
          modules: [
            {
              source: 'src/alpha/src/keep.ts',
              dependencies: [{ module: 'beta', resolved: 'beta' }],
            },
            {
              source: 'src/alpha/src/skip.ts',
              dependencies: [{ module: 'beta', resolved: 'beta' }],
            },
          ],
        }),
      ],
      ['beta', JSON.stringify({ modules: [] })],
    ]);

    const elements = new PackageDependencyCytoscapeConverter().convert(
      packages,
      reports,
      new ArchitectureExclusionFilter({
        exclusions: {
          projectFiles: {
            packages: {
              alpha: ['skip.ts'],
            },
          },
        },
      }),
      new Map([
        ['src/alpha/src/keep.ts', "import type { BetaThing } from 'beta';"],
        ['src/alpha/src/skip.ts', "import type { BetaThing } from 'beta';"],
      ]),
      new PackagePublicApiExportIndex([
        {
          package: packages[1],
          sourceText:
            "export type { BetaThing } from '#beta/contracts/beta-thing.js';",
        },
      ]),
    );

    expect(elements).toEqual([
      { data: { id: 'alpha', label: 'alpha' } },
      { data: { id: 'beta', label: 'beta' } },
      {
        data: {
          id: 'directory:beta:contracts',
          label: 'contracts',
          parent: 'beta',
        },
      },
      {
        data: {
          id: 'src/alpha/src/keep.ts',
          label: 'keep',
          parent: 'alpha',
        },
      },
      {
        data: {
          id: 'src/beta/src/contracts/beta-thing.ts',
          label: 'beta-thing',
          parent: 'directory:beta:contracts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/keep.ts->src/beta/src/contracts/beta-thing.ts',
          source: 'src/alpha/src/keep.ts',
          target: 'src/beta/src/contracts/beta-thing.ts',
        },
      },
    ]);
  });

  it('groups package diagrams under the package node', () => {
    const elements = new DependencyCruiserCytoscapeConverter().convert(
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/application/use-case.ts',
            dependencies: [],
          },
        ],
      }),
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: {},
      },
      undefined,
      {
        rootParentId: 'alpha',
        rootParentLabel: 'alpha',
      },
    );

    expect(elements).toEqual([
      { data: { id: 'alpha', label: 'alpha' } },
      {
        data: {
          id: 'directory:alpha:application',
          label: 'application',
          parent: 'alpha',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts',
          label: 'use-case',
          parent: 'directory:alpha:application',
        },
      },
    ]);
  });

  it('builds configured folder diagrams with external package nodes', () => {
    const elements = new PackageFolderDependencyCytoscapeConverter().convert(
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/application/use-case.ts',
            dependencies: [
              {
                module: 'src/alpha/src/application/model.ts',
                resolved: 'src/alpha/src/application/model.ts',
              },
              {
                module: 'src/alpha/src/infrastructure/adapter.ts',
                resolved: 'src/alpha/src/infrastructure/adapter.ts',
              },
              {
                module: 'beta',
                resolved: 'src/beta/src/index.ts',
              },
              {
                module: 'tslog',
                resolved: 'node_modules/tslog/index.js',
              },
            ],
          },
          {
            source: 'src/alpha/src/infrastructure/adapter.ts',
            dependencies: [],
          },
        ],
      }),
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: { beta: '0.1.0', tslog: '4.0.0' },
      },
      'src/application',
    );

    expect(elements).toEqual([
      {
        data: {
          id: 'folder:alpha:src/application',
          label: 'src/application',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts',
          label: 'use-case',
          parent: 'folder:alpha:src/application',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/model.ts',
          label: 'model',
          parent: 'folder:alpha:src/application',
        },
      },
      {
        data: {
          id: 'external:alpha:infrastructure',
          label: 'infrastructure',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'external:beta',
          label: 'beta',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'external:tslog',
          label: 'tslog',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts->src/alpha/src/application/model.ts',
          source: 'src/alpha/src/application/use-case.ts',
          target: 'src/alpha/src/application/model.ts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts->external:alpha:infrastructure',
          source: 'src/alpha/src/application/use-case.ts',
          target: 'external:alpha:infrastructure',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts->external:beta',
          source: 'src/alpha/src/application/use-case.ts',
          target: 'external:beta',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts->external:tslog',
          source: 'src/alpha/src/application/use-case.ts',
          target: 'external:tslog',
        },
      },
    ]);
  });

  it('consolidates resolved workspace dependencies in folder diagrams', () => {
    const packages = [
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: { beta: '0.1.0' },
      },
      {
        name: 'beta',
        root: 'D:/repo/src/beta',
        dependencies: {},
      },
    ];
    const elements = new PackageFolderDependencyCytoscapeConverter().convert(
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/application/use-case.ts',
            dependencies: [
              {
                module: '#beta/contracts/beta-thing.js',
                resolved: 'src/beta/src/contracts/beta-thing.ts',
              },
            ],
          },
        ],
      }),
      packages[0],
      'src/application',
      packages,
    );

    expect(elements).toContainEqual({
      data: {
        id: 'external:beta',
        label: 'beta',
        externalDependency: 'true',
      },
    });
    expect(elements).toContainEqual({
      data: {
        id: 'src/alpha/src/application/use-case.ts->external:beta',
        source: 'src/alpha/src/application/use-case.ts',
        target: 'external:beta',
      },
    });
  });
  it('uses package exclusions as folder diagram defaults', () => {
    const filter = new ArchitectureExclusionFilter({
      exclusions: {
        externalDependencies: ['tslog'],
        projectFiles: {
          allPackages: ['src/**/*.test.ts'],
          packages: {
            alpha: ['ignored.ts'],
          },
        },
      },
    }).forFolderDiagram('alpha', { path: 'src/application' });

    expect(filter.excludesExternalDependency('tslog')).toBe(true);
    expect(
      filter.excludesProjectFile('alpha', 'src/application/ignored.ts'),
    ).toBe(true);
    expect(
      filter.excludesProjectFile('alpha', 'src/application/model.test.ts'),
    ).toBe(true);
  });
  it('generates configured folder diagram artifacts without seeding layout files', () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'spec-n-roll-arch-folder-'));
    const packageOutputRoot = join(outputRoot, 'alpha');
    mkdirSync(packageOutputRoot);
    writeFileSync(
      join(packageOutputRoot, 'dependency-cruiser.json'),
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/application/use-case.ts',
            dependencies: [],
          },
        ],
      }),
    );

    new PackageFolderArchitectureArtifactGenerator().generate(
      outputRoot,
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: {},
      },
      {
        path: 'src/application',
      },
    );

    expect(
      existsSync(
        join(packageOutputRoot, 'folder-src-application.cytoscape.layout.json'),
      ),
    ).toBe(false);
  });
  it('renders architecture diagram controls and server-backed layout behavior', () => {
    const artifactRoot = mkdtempSync(join(tmpdir(), 'spec-n-roll-arch-html-'));
    const cytoscapeJsonPath = join(artifactRoot, 'graph.json');
    const cytoscapeHtmlPath = join(artifactRoot, 'graph.html');

    new CytoscapeArtifactWriter().write(cytoscapeJsonPath, cytoscapeHtmlPath, [
      { data: { id: 'alpha', label: 'alpha' } },
    ]);

    const html = readFileSync(cytoscapeHtmlPath, 'utf8');

    expect(html).toContain("'font-size': 25");
    expect(html).toContain('#cy { height: 100%;');
    expect(html).toContain('cytoscape-fcose@2.2.0');
    expect(html).toContain("const preferredLayout = { name: 'fcose'");
    expect(html).toContain("const fallbackLayout = { name: 'cose'");
    expect(html).toContain('id="fit-diagram"');
    expect(html).toContain('id="layout-status"');
    expect(html).toContain('class DiagramLayoutStore');
    expect(html).toContain('class DiagramLayoutClient');
    expect(html).toContain("fetch(this.layoutPath, { cache: 'no-store' })");
    expect(html).toContain("method: 'PUT'");
    expect(html).toContain("'/__spec-n-roll/layout?diagram='");
    expect(html).toContain(
      "window.location.pathname === '/' ? '/project-dependencies.cytoscape.html'",
    );
    expect(html).toContain('Layout autosave unavailable');
    expect(html).toContain('layoutStore.applySavedLayout()');
    expect(html).toContain('layoutStore.flushPendingSave()');
    expect(html).toContain('node.position(savedPosition.position)');
    expect(html).toContain('x: position.x');
    expect(html).toContain(
      "cy.on('dragfree', 'node', () => layoutStore.saveSoon());",
    );
    expect(html).not.toContain('id="export-layout"');
    expect(html).not.toContain('DiagramLayoutExporter');
    expect(html).not.toContain('localStorage');
    expect(html).not.toContain('REPO_LAYOUT');
  });

  it('serves diagrams and persists cleaned layout files through the viewer server', async () => {
    const artifactRoot = mkdtempSync(
      join(tmpdir(), 'spec-n-roll-arch-server-'),
    );
    writeFileSync(
      join(artifactRoot, 'graph.html'),
      '<!doctype html><html></html>',
    );
    writeFileSync(
      join(artifactRoot, 'project-dependencies.cytoscape.html'),
      '<!doctype html><html></html>',
    );
    writeFileSync(
      join(artifactRoot, 'graph.json'),
      JSON.stringify([
        { data: { id: 'alpha', label: 'alpha' } },
        { data: { id: 'beta', label: 'beta', parent: 'alpha' } },
        { data: { id: 'alpha->beta', source: 'alpha', target: 'beta' } },
      ]),
    );
    writeFileSync(
      join(artifactRoot, 'project-dependencies.cytoscape.json'),
      JSON.stringify([{ data: { id: 'project', label: 'project' } }]),
    );
    const runningServer = await new ArchitectureViewerHttpServer().start({
      artifactRoot,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const htmlResponse = await fetch(`${runningServer.url}graph.html`);
      expect(await htmlResponse.text()).toContain('<!doctype html>');

      const saveResponse = await fetch(
        `${runningServer.url}__spec-n-roll/layout?diagram=graph.html`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            version: 2,
            nodes: {
              alpha: { parentId: null, position: { x: 10, y: 20 } },
              beta: { parentId: 'alpha', position: { x: 5, y: 6 } },
              removed: { parentId: null, position: { x: 30, y: 40 } },
            },
          }),
        },
      );

      expect(saveResponse.status).toBe(200);
      const layoutJson = readFileSync(
        join(artifactRoot, 'graph.layout.json'),
        'utf8',
      );
      expect(layoutJson).toContain('"alpha"');
      expect(layoutJson).toContain('"beta"');
      expect(layoutJson).not.toContain('"removed"');

      const traversalResponse = await fetch(
        `${runningServer.url}__spec-n-roll/layout?diagram=..%2Foutside.html`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: 2, nodes: {} }),
        },
      );
      expect(traversalResponse.status).toBe(400);

      const rootDiagramResponse = await fetch(
        `${runningServer.url}__spec-n-roll/layout?diagram=project-dependencies.cytoscape.html`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            version: 2,
            nodes: {
              project: { parentId: null, position: { x: 1, y: 2 } },
            },
          }),
        },
      );
      expect(rootDiagramResponse.status).toBe(200);
      expect(
        readFileSync(
          join(artifactRoot, 'project-dependencies.cytoscape.layout.json'),
          'utf8',
        ),
      ).toContain('"project"');

      const malformedResponse = await fetch(
        `${runningServer.url}__spec-n-roll/layout?diagram=graph.html`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: '{',
        },
      );
      expect(malformedResponse.status).toBe(400);
    } finally {
      await runningServer.close();
    }
  });
});
