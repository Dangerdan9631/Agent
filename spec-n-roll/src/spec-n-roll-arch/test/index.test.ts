import {
  existsSync,
  mkdtempSync,
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { ArchitectureCollapseFilter } from '#arch/application/config/architecture-collapse-filter.js';
import { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import { ArchitectureLandscapeDependencySplitter } from '#arch/application/config/architecture-landscape-dependency-splitter.js';
import { ArchitectureViewerAutoLayoutScript } from '#arch/infrastructure/cytoscape/architecture-viewer-auto-layout-script.js';
import { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
import { DependencyMatrixArtifactWriter } from '#arch/infrastructure/cytoscape/dependency-matrix-artifact-writer.js';
import { ArchitectureViewerHttpServer } from '#arch/infrastructure/http/architecture-viewer-http-server.js';
import { DependencyCruiserCytoscapeConverter } from '#arch/application/graph/dependency-cruiser-cytoscape-converter.js';
import { DependencyMatrix } from '#arch/application/graph/dependency-matrix.js';
import { PackageFolderArchitectureArtifactGenerator } from '#arch/application/artifacts/package-folder-architecture-artifact-generator.js';
import { PackageDependencyCytoscapeConverter } from '#arch/application/graph/package-dependency-cytoscape-converter.js';
import { PackageFolderDependencyCytoscapeConverter } from '#arch/application/graph/package-folder-dependency-cytoscape-converter.js';
import { PackagePublicApiExportIndex } from '#arch/application/graph/package-public-api-export-index.js';
import { ArchitectureTypeCytoscapeConverter } from '#arch/application/graph/architecture-type-cytoscape-converter.js';
import { TypeScriptArchitectureTypeGraphReader } from '#arch/infrastructure/typescript/type-script-architecture-type-graph-reader.js';
import { RuntimePackageDiscoverer } from '#arch/index.js';

describe('spec-n-roll-arch', () => {
  it('creates declaration and module nodes with reference and inheritance relationships', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'spec-n-roll-arch-types-'));
    const packageRoot = join(workspaceRoot, 'src', 'alpha');
    const sourceRoot = join(packageRoot, 'src');
    mkdirSync(sourceRoot, { recursive: true });
    writeFileSync(join(sourceRoot, 'contract.ts'), 'export interface Contract {}\nexport type Alias = Contract;\nexport enum State { Ready }\n');
    writeFileSync(join(sourceRoot, 'service.ts'), "import { Contract, Alias } from './contract.js';\nexport class Service implements Contract { value!: Alias; contract!: Contract; }\nexport class PlainService implements Contract {}\nexport const create = (): Contract => new Service();\n");

    const graph = new TypeScriptArchitectureTypeGraphReader().read(workspaceRoot, [{ name: 'alpha', root: packageRoot, dependencies: {} }]);
    const service = graph.nodes.find((node) => node.label === 'Service');
    const plainService = graph.nodes.find((node) => node.label === 'PlainService');
    const contract = graph.nodes.find((node) => node.label === 'Contract');
    const moduleNode = graph.nodes.find((node) => node.moduleNode);

    expect(service?.nodeKind).toBe('class');
    expect(contract?.nodeKind).toBe('interface');
    expect(graph.nodes.find((node) => node.label === 'Alias')?.nodeKind).toBe('other');
    expect(moduleNode?.label).toBe('service module');
    expect(graph.relationships).toContainEqual({ sourceId: service?.id, targetId: contract?.id, relationshipType: 'inheritance' });
    expect(graph.relationships).toContainEqual({ sourceId: service?.id, targetId: contract?.id, relationshipType: 'reference' });
    expect(graph.relationships).toContainEqual({ sourceId: plainService?.id, targetId: contract?.id, relationshipType: 'inheritance' });
    expect(graph.relationships).not.toContainEqual({ sourceId: plainService?.id, targetId: contract?.id, relationshipType: 'reference' });
    expect(graph.relationships).toContainEqual({ sourceId: moduleNode?.id, targetId: contract?.id, relationshipType: 'reference' });
  });
  it('excludes external declaration relationships by their displayed package dependency name', () => {
    const elements = new ArchitectureTypeCytoscapeConverter().packageElements(
      {
        nodes: [{ id: 'type:src/alpha/src/runtime.ts:Runtime', label: 'Runtime', nodeKind: 'class', packageName: 'alpha', sourceFile: 'src/alpha/src/runtime.ts', moduleNode: false }],
        relationships: [
          { sourceId: 'type:src/alpha/src/runtime.ts:Runtime', targetId: 'external:node:path', relationshipType: 'reference' },
          { sourceId: 'type:src/alpha/src/runtime.ts:Runtime', targetId: 'external:node:url', relationshipType: 'reference' },
        ],
      },
      { name: 'alpha', root: 'D:/repo/src/alpha', dependencies: {} },
      new ArchitectureExclusionFilter({ exclusions: { projectFiles: { packages: { alpha: ['node:path', 'node:url'] } } } }),
    );

    expect(elements.some((element) => element.data.id === 'external:node:path')).toBe(false);
    expect(elements.some((element) => element.data.id === 'external:node:url')).toBe(false);
  });
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
      {
        data: {
          id: 'alpha',
          label: 'alpha',
          workspaceDependency: 'true',
        },
      },
      {
        data: {
          id: 'beta',
          label: 'beta',
          workspaceDependency: 'true',
        },
      },
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
      {
        data: {
          id: 'alpha',
          label: 'alpha',
          workspaceDependency: 'true',
        },
      },
      {
        data: {
          id: 'beta',
          label: 'beta',
          workspaceDependency: 'true',
        },
      },
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

  it('collapses configured external dependencies and excludes package files from package graphs', () => {
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
                module: 'commander',
                resolved: 'node_modules/commander/index.js',
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
          projectFiles: {
            allPackages: ['**/*.test'],
            packages: {
              alpha: ['skip'],
            },
          },
        },
      }),
      {
        collapseFilter: new ArchitectureCollapseFilter({
          collapsed: {
            externalDependencies: ['tslog'],
          },
        }),
      },
    );

    expect(elements).toEqual([
      {
        data: {
          id: 'src/alpha/src/keep.ts',
          label: 'keep',
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
          id: 'node_modules/commander/index.js',
          label: 'node_modules/commander/index.js',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'src/alpha/src/keep.ts->external:tslog',
          source: 'src/alpha/src/keep.ts',
          target: 'external:tslog',
        },
      },
      {
        data: {
          id: 'src/alpha/src/keep.ts->node_modules/commander/index.js',
          source: 'src/alpha/src/keep.ts',
          target: 'node_modules/commander/index.js',
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
      {
        data: {
          id: 'alpha',
          label: 'alpha',
          workspaceDependency: 'true',
        },
      },
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

  it('splits configured landscape external dependencies by importing workspace package', () => {
    const packageNames = [
      'spec-n-roll',
      'spec-n-roll-mcp',
      'spec-n-roll-runtime',
    ];
    const packages = packageNames.map((name) => ({
      name,
      root: `D:/repo/src/${name}`,
      dependencies: {},
    }));
    const reports = new Map(
      packageNames.map((name) => [
        name,
        JSON.stringify({
          modules: [
            {
              source: `src/${name}/src/index.ts`,
              dependencies: [
                {
                  module: 'commander',
                  resolved: 'node_modules/commander/index.js',
                  coreModule: false,
                },
              ],
            },
          ],
        }),
      ]),
    );

    const elements = new PackageDependencyCytoscapeConverter().convert(
      packages,
      reports,
      undefined,
      undefined,
      undefined,
      new ArchitectureLandscapeDependencySplitter({
        split: {
          landscape: {
            externalDependencies: { commander: packageNames },
          },
        },
      }),
    );

    expect(
      elements
        .filter((element) => element.data.label === 'commander')
        .map((element) => element.data.id),
    ).toEqual([
      'external:commander:spec-n-roll',
      'external:commander:spec-n-roll-mcp',
      'external:commander:spec-n-roll-runtime',
    ]);
    expect(
      elements
        .filter((element) => element.data.source != null)
        .map((element) => element.data.target),
    ).toEqual([
      'external:commander:spec-n-roll',
      'external:commander:spec-n-roll-mcp',
      'external:commander:spec-n-roll-runtime',
    ]);
  });

  it('excludes package external dependencies by their displayed node name', () => {
    const elements = new DependencyCruiserCytoscapeConverter().convert(
      JSON.stringify({
        modules: [
          {
            source: 'src/alpha/src/application/use-case.ts',
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
      {
        name: 'alpha',
        root: 'D:/repo/src/alpha',
        dependencies: {},
      },
      new ArchitectureExclusionFilter({
        exclusions: {
          projectFiles: { packages: { alpha: ['tslog'] } },
        },
      }),
    );

    expect(
      elements.some((element) => element.data.id === 'external:tslog'),
    ).toBe(false);
    expect(
      elements.some((element) => element.data.id.includes('->external:tslog')),
    ).toBe(false);
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
          landscape: ['tslog'],
        },
      }),
    );

    expect(elements).toEqual([]);
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
              alpha: ['skip'],
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
      {
        data: {
          id: 'alpha',
          label: 'alpha',
          workspaceDependency: 'true',
        },
      },
      {
        data: {
          id: 'beta',
          label: 'beta',
          workspaceDependency: 'true',
        },
      },
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
      {
        data: {
          id: 'alpha',
          label: 'alpha',
          workspaceDependency: 'true',
        },
      },
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
        workspaceDependency: 'true',
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
  it('uses workspace collapse and exclusion settings as folder diagram defaults', () => {
    const filter = new ArchitectureExclusionFilter({
      exclusions: {
        projectFiles: {
          allPackages: ['**/*.test'],
          packages: {
            alpha: ['application/ignored'],
          },
        },
      },
    }).forFolderDiagram('alpha', { path: 'src/application' });
    const collapseFilter = new ArchitectureCollapseFilter({
      collapsed: {
        externalDependencies: ['tslog'],
      },
    }).forFolderDiagram({ path: 'src/application' });

    expect(collapseFilter.collapsesExternalDependency('tslog')).toBe(true);
    expect(filter.excludesProjectNode('alpha', 'application/ignored')).toBe(
      true,
    );
    expect(filter.excludesProjectNode('alpha', 'application/model.test')).toBe(
      true,
    );
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
    expect(
      existsSync(join(packageOutputRoot, 'folder-src-application.matrix.html')),
    ).toBe(true);
    expect(
      readFileSync(
        join(packageOutputRoot, 'folder-src-application.matrix.html'),
        'utf8',
      ),
    ).toContain('Dependency graph metrics');
  });

  it('builds sorted dependency matrices with graph complexity metrics', () => {
    const matrix = DependencyMatrix.fromElements([
      { data: { id: 'src/alpha/src/zeta.ts', label: 'zeta' } },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts',
          label: 'use-case',
        },
      },
      { data: { id: 'directory:alpha:application', label: 'application' } },
      {
        data: {
          id: 'external:tslog',
          label: 'tslog',
          externalDependency: 'true',
        },
      },
      {
        data: {
          id: 'src/alpha/src/application/use-case.ts->src/alpha/src/zeta.ts',
          source: 'src/alpha/src/application/use-case.ts',
          target: 'src/alpha/src/zeta.ts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/zeta.ts->src/alpha/src/application/use-case.ts',
          source: 'src/alpha/src/zeta.ts',
          target: 'src/alpha/src/application/use-case.ts',
        },
      },
      {
        data: {
          id: 'src/alpha/src/zeta.ts->external:tslog',
          source: 'src/alpha/src/zeta.ts',
          target: 'external:tslog',
        },
      },
    ]);

    expect(matrix.files).toEqual([
      'src/alpha/src/application/use-case.ts',
      'src/alpha/src/zeta.ts',
    ]);
    expect(
      matrix.hasDependency(
        'src/alpha/src/application/use-case.ts',
        'src/alpha/src/zeta.ts',
      ),
    ).toBe(true);
    expect(matrix.metrics).toEqual({
      fileCount: 2,
      dependencyCount: 2,
      density: 1,
      averageOutboundDependencies: 1,
      maximumOutboundDependencies: 1,
      maximumInboundDependencies: 1,
      isolatedFileCount: 0,
      cycleGroupCount: 1,
    });
  });
  it('renders architecture diagram controls and server-backed layout behavior', () => {
    const artifactRoot = mkdtempSync(join(tmpdir(), 'spec-n-roll-arch-html-'));
    const cytoscapeJsonPath = join(artifactRoot, 'graph.json');
    const cytoscapeHtmlPath = join(artifactRoot, 'graph.html');

    new CytoscapeArtifactWriter().write(
      cytoscapeJsonPath,
      cytoscapeHtmlPath,
      [{ data: { id: 'alpha', label: 'alpha' } }],
      [
        {
          title: 'Landscape',
          children: [
            {
              title: 'Diagram',
              htmlPath: join(artifactRoot, 'landscape.cytoscape.html'),
            },
          ],
        },
        {
          title: 'alpha',
          children: [
            {
              title: 'Diagram',
              htmlPath: join(artifactRoot, 'alpha', 'cytoscape.html'),
            },
            {
              title: 'Dependency matrix',
              htmlPath: join(artifactRoot, 'alpha', 'matrix.html'),
            },
          ],
        },
        {
          title: 'beta',
          children: [
            {
              title: 'Diagram',
              htmlPath: join(artifactRoot, 'beta', 'cytoscape.html'),
            },
          ],
        },
      ],
    );

    const html = readFileSync(cytoscapeHtmlPath, 'utf8');
    const inlineScript = /<script>([\s\S]*)<\/script>/u.exec(html)?.[1];

    expect(inlineScript).toBeDefined();
    expect(() => new Script(inlineScript ?? '')).not.toThrow();
    expect(html).toContain("'font-size': 25");
    expect(html).toContain('node[nodeKind = "class"]');
    expect(html).toContain('node[nodeKind = "interface"]');
    expect(html).toContain('node[nodeKind = "other"]');
    expect(html).toContain('edge[relationshipType = "inheritance"]');
    expect(html).toContain('Implements/extends');
    expect(html).toContain('const MINIMUM_WHEEL_SENSITIVITY = 0.15');
    expect(html).toContain('const MAXIMUM_WHEEL_SENSITIVITY = 1');
    expect(html).toContain(
      'Math.max(MINIMUM_WHEEL_SENSITIVITY, BASE_WHEEL_SENSITIVITY / zoom)',
    );
    expect(html).toContain('#cy { background: #ffffff; height: 100%;');
    expect(html).toContain('id="auto-layout"');
    expect(html).toContain(
      'id="split-external-dependency" type="button" disabled>Split</button>',
    );
    expect(html).toContain('toggle-external-dependency-split');
    expect(html).toContain(
      'id="vertical-layout" type="button" aria-pressed="false">Vertical</button>',
    );
    expect(html).toContain('class DiagramLayoutGroup');
    expect(html).toContain('class DiagramAutoLayout');
    expect(html).toContain('dependencyLayers(groups, scopeElement)');
    expect(html).toContain('groupForNode(node, groupsById, scopeElement)');
    expect(html).toContain('this.graph.batch(() => {');
    expect(html).toContain('const autoLayout = new DiagramAutoLayout(cy)');
    expect(html).toContain('layoutGroup(node)');
    expect(html).toContain('autoLayout.layoutGroup(selectedGroup)');
    expect(html).toContain('const diagramReady = initializeDiagramLayout()');
    expect(html).toContain('autoLayoutButton.addEventListener');
    expect(html).not.toContain('cytoscape-fcose@2.2.0');
    expect(html).not.toContain("const preferredLayout = { name: 'fcose'");
    expect(html).toContain('id="fit-diagram"');
    expect(html).toContain('id="export-diagram-image"');
    expect(html).toContain(
      'id="create-folder-diagram" type="button" disabled>Create Diagram</button>',
    );
    expect(html).toContain('>Export Image</button>');
    expect(html).toContain(
      'id="export-all-diagram-images" type="button">Export All</button>',
    );
    expect(html).toContain('id="hide-action"');
    expect(html).not.toContain('id="hide-node"');
    expect(html).not.toContain('id="hide-connection"');
    expect(html).toContain('id="toggle-hidden-connections"');
    expect(html).toContain('>Hidden</button>');
    expect(html).toContain('id="collapse-group"');
    expect(html).toContain('class="toolbar-row toolbar-row-primary"');
    expect(html).toContain('class="toolbar-row toolbar-row-secondary"');
    expect(html).toContain(
      '<span class="toolbar-separator" aria-hidden="true">|</span>',
    );
    expect(html).toContain(
      'id="layout-rows" type="range" min="3" max="8" value="5"',
    );
    expect(html).toContain(
      'id="horizontal-gap" type="range" min="80" max="200" step="5" value="120"',
    );
    expect(html).toContain(
      'id="vertical-gap" type="range" min="80" max="200" step="5" value="120"',
    );
    expect(html).toContain(
      '<button class="toolbar-button" id="snap-diagram" type="button">Snap</button>',
    );
    expect(html).toContain(
      'id="snap-grid" type="range" min="5" max="100" step="5" value="20"',
    );
    expect(html).toContain('class DiagramGridSnapper');
    expect(html).toContain('Math.round(position.x / gridSize) * gridSize');
    expect(html).toContain('Math.round(position.y / gridSize) * gridSize');
    expect(html).toContain('node.children().length === 0');
    expect(html).toContain('gridSnapper.snap(Number(snapGrid.value), selectedNode)');
    expect(html).toContain('autoLayout.configure(');
    expect(html).toContain('this.maxRows = 5');
    expect(html).toContain('this.verticalMode = false');
    expect(html).toContain('verticalLayout.addEventListener');
    expect(html).toContain('class HiddenConnectionState');
    expect(html).toContain('selectedEdgeId');
    expect(html).toContain('edge.selected-connection');
    expect(html).toContain('event.stopPropagation();');
    expect(html).toContain(
      'hiddenConnections: this.hiddenConnectionState.ids()',
    );
    expect(html).toContain('synchronizeCollapsedGroups()');
    expect(html).toContain('class DiagramImageExportClient');
    expect(html).toContain('class DiagramImageExporter');
    expect(html).toContain('class AllDiagramImagesExporter');
    expect(html).toContain('window.exportDiagramImage = async () => {');
    expect(html).toContain('All images exported: ');
    expect(html).toContain(
      '["landscape.cytoscape.html","alpha/cytoscape.html","beta/cytoscape.html"]',
    );
    expect(html).not.toContain(
      '["landscape.cytoscape.html","alpha/matrix.html"',
    );
    expect(html).toContain("'/__spec-n-roll/image?diagram='");
    expect(html).toContain("'content-type': 'image/png'");
    expect(html).toContain("output: 'blob'");
    expect(html).toContain('scale: 2');
    expect(html).toContain('Image exported: ');
    expect(html).not.toContain('URL.createObjectURL');
    expect(html).not.toContain('downloadLink');
    expect(html).toContain('id="layout-status"');
    expect(html).toContain('class DiagramLayoutStore');
    expect(html).toContain('class DiagramLayoutClient');
    expect(html).toContain("fetch(this.layoutPath, { cache: 'no-store' })");
    expect(html).toContain("method: 'PUT'");
    expect(html).toContain("'/__spec-n-roll/layout?diagram='");
    expect(html).toContain(
      "window.location.pathname === '/' ? '/landscape.cytoscape.html'",
    );
    expect(html).toContain('Layout autosave unavailable');
    expect(html).toContain('layoutStore.applySavedLayout()');
    expect(html).toContain('layoutStore.flushPendingSave()');
    expect(html).toContain('node.position(savedPosition.position)');
    expect(html).toContain('x: position.x');
    expect(html).toContain("cy.on('dragfree', 'node', (event) => {");
    expect(html).toContain("event.target.hasClass('collapsed-proxy')");
    expect(html).not.toContain('id="export-layout"');
    expect(html).not.toContain('DiagramLayoutExporter');
    expect(html).toContain('spec-n-roll-arch-dark-mode');
    expect(html).toContain('loadDarkModePreference()');
    expect(html).toContain('saveDarkModePreference()');
    expect(html).not.toContain('REPO_LAYOUT');
  });

  it('places nested layout groups below the groups that depend on them', () => {
    class LayoutTestCollection<Element> {
      constructor(private readonly elements: Element[]) {}

      not(): LayoutTestCollection<Element> {
        return this;
      }

      filter(
        predicate: (element: Element) => boolean,
      ): LayoutTestCollection<Element> {
        return new LayoutTestCollection(this.elements.filter(predicate));
      }

      toArray(): Element[] {
        return [...this.elements];
      }

      first(): Element {
        return this.elements[0];
      }

      forEach(callback: (element: Element) => void): void {
        this.elements.forEach(callback);
      }

      empty(): boolean {
        return this.elements.length === 0;
      }
    }

    class LayoutTestNode {
      private readonly childNodes: LayoutTestNode[] = [];

      private currentPosition = { x: 0, y: 0 };

      constructor(
        private readonly nodeId: string,
        private readonly label: string,
        private readonly parentNode?: LayoutTestNode,
        private readonly padding = 0,
      ) {
        parentNode?.addChild(this);
      }

      addChild(child: LayoutTestNode): void {
        this.childNodes.push(child);
      }

      children(): LayoutTestCollection<LayoutTestNode> {
        return new LayoutTestCollection(this.childNodes);
      }

      parent(): LayoutTestCollection<LayoutTestNode> {
        return new LayoutTestCollection(
          this.parentNode ? [this.parentNode] : [],
        );
      }

      id(): string {
        return this.nodeId;
      }

      data(name: string): string {
        return name === 'label' ? this.label : '';
      }

      boundingBox(): { w: number; h: number; x1: number; y1: number } {
        return { w: 100, h: 50, ...this.currentPosition };
      }

      pstyle(name: string): { pfValue: number } | undefined {
        return name === 'padding' ? { pfValue: this.padding } : undefined;
      }

      position(nextPosition: { x: number; y: number }): void {
        this.currentPosition = nextPosition;
      }

      currentLayoutPosition(): { x: number; y: number } {
        return this.currentPosition;
      }
    }

    class LayoutTestEdge {
      constructor(
        private readonly sourceNode: LayoutTestNode,
        private readonly targetNode: LayoutTestNode,
      ) {}

      source(): LayoutTestNode {
        return this.sourceNode;
      }

      target(): LayoutTestNode {
        return this.targetNode;
      }
    }

    class LayoutTestGraph {
      constructor(
        private readonly graphNodes: LayoutTestNode[],
        private readonly graphEdges: LayoutTestEdge[],
      ) {}

      nodes(): LayoutTestCollection<LayoutTestNode> {
        return new LayoutTestCollection(this.graphNodes);
      }

      edges(): LayoutTestCollection<LayoutTestEdge> {
        return new LayoutTestCollection(this.graphEdges);
      }

      batch(callback: () => void): void {
        callback();
      }
    }

    const app = new LayoutTestNode('app', 'app');
    const alpha = new LayoutTestNode('app:alpha', 'alpha', app);
    const beta = new LayoutTestNode('app:beta', 'beta', app);
    const charlie = new LayoutTestNode('app:charlie', 'charlie', app);
    const delta = new LayoutTestNode('app:delta', 'delta', app);
    const epsilon = new LayoutTestNode('app:epsilon', 'epsilon', app);
    const foxtrot = new LayoutTestNode('app:foxtrot', 'foxtrot', app);
    const library = new LayoutTestNode('library', 'library');
    const libraryIndex = new LayoutTestNode('library:index', 'index', library);
    const module = new LayoutTestNode(
      'library:application',
      'application',
      library,
      24,
    );
    const libraryFile = new LayoutTestNode(
      'library:application:alpha',
      'alpha',
      module,
    );
    const libraryBeta = new LayoutTestNode(
      'library:application:beta',
      'beta',
      module,
    );
    const libraryCharlie = new LayoutTestNode(
      'library:application:charlie',
      'charlie',
      module,
    );
    const libraryDelta = new LayoutTestNode(
      'library:application:delta',
      'delta',
      module,
    );
    const graph = new LayoutTestGraph(
      [
        app,
        alpha,
        beta,
        charlie,
        delta,
        epsilon,
        foxtrot,
        library,
        libraryIndex,
        module,
        libraryFile,
        libraryBeta,
        libraryCharlie,
        libraryDelta,
      ],
      [
        new LayoutTestEdge(beta, libraryFile),
        new LayoutTestEdge(libraryDelta, libraryFile),
      ],
    );
    const DiagramAutoLayout = new Script(
      `${ArchitectureViewerAutoLayoutScript.render()}\nDiagramAutoLayout`,
    ).runInNewContext() as new (layoutGraph: LayoutTestGraph) => {
      configure(
        maxRows: number,
        horizontalGap: number,
        verticalGap: number,
        verticalMode?: boolean,
      ): void;
      layout(): void;
      layoutGroup(node: LayoutTestNode): boolean;
    };

    new DiagramAutoLayout(graph).layout();

    expect(alpha.currentLayoutPosition().x).toBeLessThan(
      beta.currentLayoutPosition().x,
    );
    expect(alpha.currentLayoutPosition().y).toBe(
      charlie.currentLayoutPosition().y,
    );
    expect(delta.currentLayoutPosition().y).toBeGreaterThan(
      alpha.currentLayoutPosition().y,
    );
    expect(
      libraryIndex.currentLayoutPosition().x -
        50 -
        (libraryDelta.currentLayoutPosition().x + 50 + 24),
    ).toBe(120);
    expect(libraryDelta.currentLayoutPosition().y).toBeLessThan(
      libraryFile.currentLayoutPosition().y,
    );
    expect(beta.currentLayoutPosition().y).toBeLessThan(
      libraryFile.currentLayoutPosition().y,
    );

    const appPositionBeforeGroupLayout = alpha.currentLayoutPosition();
    const indexPositionBeforeGroupLayout = libraryIndex.currentLayoutPosition();

    new DiagramAutoLayout(graph).layoutGroup(module);

    expect(alpha.currentLayoutPosition()).toEqual(appPositionBeforeGroupLayout);
    expect(libraryIndex.currentLayoutPosition()).toEqual(
      indexPositionBeforeGroupLayout,
    );

    const configuredLayout = new DiagramAutoLayout(graph);
    configuredLayout.configure(8, 80, 200);
    configuredLayout.layout();

    expect(alpha.currentLayoutPosition().y).toBe(
      foxtrot.currentLayoutPosition().y,
    );
    expect(
      beta.currentLayoutPosition().x - alpha.currentLayoutPosition().x,
    ).toBe(180);
    expect(libraryFile.currentLayoutPosition().y).toBe(
      libraryDelta.currentLayoutPosition().y + 250,
    );

    const verticalLayout = new DiagramAutoLayout(graph);
    verticalLayout.configure(3, 80, 200, true);
    verticalLayout.layout();

    expect(alpha.currentLayoutPosition().x).toBe(
      charlie.currentLayoutPosition().x,
    );
    expect(alpha.currentLayoutPosition().y).toBeLessThan(
      charlie.currentLayoutPosition().y,
    );
    expect(
      beta.currentLayoutPosition().y - alpha.currentLayoutPosition().y,
    ).toBe(250);
    expect(beta.currentLayoutPosition().x).toBeLessThan(
      libraryFile.currentLayoutPosition().x,
    );

    const alphaPositionBeforeVerticalGroupLayout =
      alpha.currentLayoutPosition();
    verticalLayout.layoutGroup(module);

    expect(alpha.currentLayoutPosition()).toEqual(
      alphaPositionBeforeVerticalGroupLayout,
    );
  });

  it('renders dependency matrix navigation and metrics', () => {
    const artifactRoot = mkdtempSync(
      join(tmpdir(), 'spec-n-roll-arch-matrix-'),
    );
    const matrixHtmlPath = join(artifactRoot, 'matrix.html');

    new DependencyMatrixArtifactWriter().write(
      matrixHtmlPath,
      [
        { data: { id: 'src/alpha/src/zeta.ts', label: 'zeta' } },
        {
          data: {
            id: 'src/alpha/src/application/use-case.ts',
            label: 'use-case',
          },
        },
        {
          data: {
            id: 'src/alpha/src/application/use-case.ts->src/alpha/src/zeta.ts',
            source: 'src/alpha/src/application/use-case.ts',
            target: 'src/alpha/src/zeta.ts',
          },
        },
      ],
      [
        {
          title: 'alpha',
          children: [
            {
              title: 'Diagram',
              htmlPath: join(artifactRoot, 'cytoscape.html'),
            },
            { title: 'Dependency matrix', htmlPath: matrixHtmlPath },
          ],
        },
      ],
    );

    const html = readFileSync(matrixHtmlPath, 'utf8');

    expect(html).toContain('class="navigation-group-title">alpha</div>');
    expect(html).toContain('>Dependency matrix</a>');
    expect(html).toContain('navigation-children');
    expect(html).toContain('class="navigation-link current"');
    expect(html).toContain('Dependency graph metrics');
    expect(html).not.toContain('id="export-diagram-image"');
    expect(html).not.toContain('class DiagramImageExportClient');
    expect(html).not.toContain('class DiagramImageExporter');
    expect(html).toContain('src/alpha/src/application/use-case.ts');
    expect(html).toContain('src/alpha/src/zeta.ts');
    expect(html).toContain('Declarations');
    expect(html).toContain('Dependencies');
    expect(html).toContain('Density');
    expect(html).toContain('50.00%');
    expect(html).toContain('rotate(-90deg)');
    expect(html).toContain('width: max-content');
    expect(html).toContain('max-width: 30px');
    expect(html).toContain('class="column-file-name">use-case.ts</span>');
    expect(html).toContain('class="row-file-name">use-case.ts</span>');
    expect(html).toContain(
      'class="column-folder-path">src/alpha/src/application</span>',
    );
    expect(html).toContain(
      'class="row-folder-path">src/alpha/src/application</span>',
    );
    expect(html).toContain('column-odd');
    expect(html).toContain('row-folder-even');
    expect(html).toContain('column-folder-odd');
    expect(html).toContain('spec-n-roll-arch-dark-mode');
    expect(html).toContain('loadDarkModePreference()');
    expect(html).toContain('saveDarkModePreference()');
  });

  it('writes hidden node exclusions to the root config section for the current diagram', async () => {
    const workspaceRoot = mkdtempSync(
      join(tmpdir(), 'spec-n-roll-arch-config-'),
    );
    const artifactRoot = join(workspaceRoot, 'architecture');
    const packageArtifactRoot = join(artifactRoot, 'alpha');
    mkdirSync(packageArtifactRoot, { recursive: true });
    writeFileSync(
      join(workspaceRoot, 'spec-n-roll.architecture.config.cjs'),
      [
        'module.exports = {',
        '  exclusions: {',
        '    projectFiles: { packages: { alpha: ["keep"] } }',
        '  },',
        '  folderDiagrams: {',
        '    packages: { alpha: [{ path: "src/application" }] }',
        '  }',
        '};',
      ].join('\n'),
    );
    writeFileSync(
      join(packageArtifactRoot, 'folder-src-application.cytoscape.html'),
      '<!doctype html><html></html>',
    );
    writeFileSync(
      join(packageArtifactRoot, 'folder-src-application.cytoscape.json'),
      JSON.stringify([
        {
          data: {
            id: 'src/alpha/src/application/use-case.ts',
            label: 'use-case',
          },
        },
      ]),
    );
    writeFileSync(
      join(packageArtifactRoot, 'cytoscape.html'),
      '<!doctype html><html></html>',
    );
    writeFileSync(
      join(packageArtifactRoot, 'cytoscape.json'),
      JSON.stringify([{ data: { id: 'src/alpha/src/cli.ts', label: 'cli' } }]),
    );

    const runningServer = await new ArchitectureViewerHttpServer().start({
      artifactRoot,
      workspaceRoot,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const exclusionsResponse = await fetch(
        `${runningServer.url}__spec-n-roll/config?diagram=alpha/cytoscape.html`,
      );
      expect(exclusionsResponse.status).toBe(200);
      await expect(exclusionsResponse.json()).resolves.toEqual({
        allPackages: [],
        diagram: ['keep'],
        diagramLabel: 'alpha',
      });

      const addExclusionResponse = await fetch(
        `${runningServer.url}__spec-n-roll/config?diagram=alpha/cytoscape.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'add-exclusion',
            scope: 'all-packages',
            exclusion: 'composition/dispatcher/dispatcher-container-factory',
          }),
        },
      );
      expect(addExclusionResponse.status).toBe(200);

      const folderHideResponse = await fetch(
        `${runningServer.url}__spec-n-roll/config?diagram=alpha/folder-src-application.cytoscape.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'hide-node',
            nodeId: 'src/alpha/src/application/use-case.ts',
          }),
        },
      );
      expect(folderHideResponse.status).toBe(200);

      const packageHideResponse = await fetch(
        `${runningServer.url}__spec-n-roll/config?diagram=alpha/cytoscape.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'hide-node',
            nodeId: 'src/alpha/src/cli.ts',
          }),
        },
      );
      expect(packageHideResponse.status).toBe(200);

      const configText = readFileSync(
        join(workspaceRoot, 'spec-n-roll.architecture.config.cjs'),
        'utf8',
      );
      expect(configText).toContain('"application/use-case"');
      expect(configText).toContain('"keep"');
      expect(configText).toContain('"cli"');
      expect(configText).toContain(
        '"composition/dispatcher/dispatcher-container-factory"',
      );
    } finally {
      await runningServer.close();
    }
  });
  it('persists landscape external dependency split and unsplit decisions', async () => {
    const workspaceRoot = mkdtempSync(
      join(tmpdir(), 'spec-n-roll-arch-split-config-'),
    );
    const artifactRoot = join(workspaceRoot, 'architecture');
    mkdirSync(artifactRoot);
    writeFileSync(
      join(workspaceRoot, 'spec-n-roll.architecture.config.cjs'),
      'module.exports = {};\n',
    );
    writeFileSync(
      join(artifactRoot, 'landscape.cytoscape.html'),
      '<!doctype html><html></html>',
    );
    writeFileSync(
      join(artifactRoot, 'landscape.cytoscape.json'),
      JSON.stringify([
        {
          data: {
            id: 'external:commander',
            label: 'commander',
            externalDependency: 'true',
          },
        },
        {
          data: {
            id: 'src/alpha/src/index.ts->external:commander',
            source: 'src/alpha/src/index.ts',
            target: 'external:commander',
          },
        },
        {
          data: {
            id: 'src/beta/src/index.ts->external:commander',
            source: 'src/beta/src/index.ts',
            target: 'external:commander',
          },
        },
      ]),
    );
    const runningServer = await new ArchitectureViewerHttpServer().start({
      artifactRoot,
      workspaceRoot,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const splitResponse = await fetch(
        `${runningServer.url}__spec-n-roll/config?diagram=landscape.cytoscape.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle-external-dependency-split',
            nodeId: 'external:commander',
          }),
        },
      );
      expect(splitResponse.status).toBe(200);
      expect(
        readFileSync(
          join(workspaceRoot, 'spec-n-roll.architecture.config.cjs'),
          'utf8',
        ),
      ).toContain('"alpha"');
      expect(
        readFileSync(
          join(workspaceRoot, 'spec-n-roll.architecture.config.cjs'),
          'utf8',
        ),
      ).toContain('"beta"');

      writeFileSync(
        join(artifactRoot, 'landscape.cytoscape.json'),
        JSON.stringify([
          {
            data: {
              id: 'external:commander:alpha',
              label: 'commander',
              externalDependency: 'true',
              splitExternalDependency: 'true',
              splitSourcePackage: 'alpha',
            },
          },
        ]),
      );
      const unsplitResponse = await fetch(
        `${runningServer.url}__spec-n-roll/config?diagram=landscape.cytoscape.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle-external-dependency-split',
            nodeId: 'external:commander:alpha',
          }),
        },
      );
      expect(unsplitResponse.status).toBe(200);
      const configText = readFileSync(
        join(workspaceRoot, 'spec-n-roll.architecture.config.cjs'),
        'utf8',
      );
      expect(configText).not.toContain('"alpha"');
      expect(configText).toContain('"beta"');
    } finally {
      await runningServer.close();
    }
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
      join(artifactRoot, 'landscape.cytoscape.html'),
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
      join(artifactRoot, 'landscape.cytoscape.json'),
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
            version: 3,
            nodes: {
              alpha: { parentId: null, position: { x: 10, y: 20 } },
              beta: { parentId: 'alpha', position: { x: 5, y: 6 } },
              removed: { parentId: null, position: { x: 30, y: 40 } },
            },
            hiddenConnections: ['alpha->beta', 'removed->edge'],
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
      expect(layoutJson).toContain('"alpha->beta"');
      expect(layoutJson).not.toContain('"removed->edge"');
      const pngBody = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const imageResponse = await fetch(
        `${runningServer.url}__spec-n-roll/image?diagram=graph.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'image/png' },
          body: pngBody,
        },
      );
      const imageResult = (await imageResponse.json()) as { fileName: string };
      expect(imageResponse.status).toBe(200);
      expect(imageResult.fileName).toBe('graph.png');
      expect(readFileSync(join(artifactRoot, imageResult.fileName))).toEqual(
        pngBody,
      );
      expect(readdirSync(artifactRoot)).toContain(imageResult.fileName);

      const replacementPngBody = Buffer.concat([pngBody, Buffer.from([0x01])]);
      const replacementImageResponse = await fetch(
        `${runningServer.url}__spec-n-roll/image?diagram=graph.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'image/png' },
          body: replacementPngBody,
        },
      );
      const replacementImageResult =
        (await replacementImageResponse.json()) as { fileName: string };
      expect(replacementImageResponse.status).toBe(200);
      expect(replacementImageResult.fileName).toBe('graph.png');
      expect(readFileSync(join(artifactRoot, 'graph.png'))).toEqual(
        replacementPngBody,
      );
      expect(
        readdirSync(artifactRoot).filter((fileName) =>
          fileName.endsWith('.png'),
        ),
      ).toEqual(['graph.png']);

      writeFileSync(join(artifactRoot, 'matrix.html'), '<!doctype html>');
      const matrixImageResponse = await fetch(
        `${runningServer.url}__spec-n-roll/image?diagram=matrix.html`,
        {
          method: 'POST',
          headers: { 'content-type': 'image/png' },
          body: pngBody,
        },
      );
      expect(matrixImageResponse.status).toBe(400);

      const traversalResponse = await fetch(
        `${runningServer.url}__spec-n-roll/layout?diagram=..%2Foutside.html`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            version: 3,
            nodes: {},
            hiddenConnections: [],
          }),
        },
      );
      expect(traversalResponse.status).toBe(400);

      const rootDiagramResponse = await fetch(
        `${runningServer.url}__spec-n-roll/layout?diagram=landscape.cytoscape.html`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            version: 3,
            nodes: {
              project: { parentId: null, position: { x: 1, y: 2 } },
            },
            hiddenConnections: [],
          }),
        },
      );
      expect(rootDiagramResponse.status).toBe(200);
      expect(
        readFileSync(
          join(artifactRoot, 'landscape.cytoscape.layout.json'),
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
