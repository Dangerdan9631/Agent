import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
import { DependencyCruiserCytoscapeConverter } from '#arch/application/graph/dependency-cruiser-cytoscape-converter.js';
import { PackageDependencyCytoscapeConverter } from '#arch/application/graph/package-dependency-cytoscape-converter.js';
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

  it('renders architecture diagram labels at 2.5x the prior size', () => {
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
  });
});
