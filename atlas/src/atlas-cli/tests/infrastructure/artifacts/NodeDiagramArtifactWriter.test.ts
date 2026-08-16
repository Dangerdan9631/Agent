import { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import {
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { NodeDiagramArtifactWriter } from '#infrastructure/artifacts/NodeDiagramArtifactWriter.js';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Allocates temporary artifact roots for graph serialization integration tests.
 */
class TemporaryWriterRoot {
  /**
   * Holds every allocated root pending suite cleanup.
   */
  private static readonly roots: string[] = [];

  /**
   * Creates a wrapper for one temporary artifact root.
   *
   * @param rootPath - Absolute generated artifact root path.
   */
  private constructor(public readonly rootPath: string) {}

  /**
   * Allocates a clean temporary root.
   *
   * @returns Ready artifact-root wrapper.
   */
  public static async create(): Promise<TemporaryWriterRoot> {
    const rootPath = await mkdtemp(join(tmpdir(), 'atlas-writer-'));
    this.roots.push(rootPath);
    return new TemporaryWriterRoot(rootPath);
  }

  /**
   * Creates the shared single-package workspace used by artifact writer scenarios.
   *
   * @returns Workspace rooted in this temporary artifact directory.
   */
  public createWorkspace(): WorkspaceSnapshot {
    return new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        this.rootPath,
        join(this.rootPath, 'atlas.config.yml'),
        this.rootPath
      ),
      {
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] }
      },
      [
        new WorkspacePackage(
          '@demo/app',
          join(this.rootPath, 'src', 'demo-app'),
          'src/demo-app',
          [join(this.rootPath, 'src', 'demo-app', 'src')],
          'runtime',
          [],
          undefined
        )
      ]
    );
  }

  /**
   * Removes roots allocated by this suite.
   *
   * @returns A promise resolving after all generated artifacts are removed.
   */
  public static async removeAll(): Promise<void> {
    await Promise.all(this.roots.map((rootPath) => rm(rootPath, { recursive: true, force: true })));
    this.roots.length = 0;
  }
}

/**
 * Verifies generated Cytoscape data preserves package and nested source-directory containment.
 */
describe('NodeDiagramArtifactWriter', () => {
  afterEach(TemporaryWriterRoot.removeAll.bind(TemporaryWriterRoot));

  /**
   * Writes deterministic nested directory compounds and assigns the deepest parent to declarations.
   */
  it('writes nested package directory compounds', async () => {
    const root = await TemporaryWriterRoot.create();
    const workspace = root.createWorkspace();
    const diagram = new DiagramGraph(
      'landscape',
      'Landscape',
      [
        new DeclarationNode(
          'feature',
          'Feature',
          'class',
          '@demo/app',
          'src/demo-app/src/features/Feature.ts',
          false
        )
      ],
      []
    );

    const writer = new NodeDiagramArtifactWriter(new DeterministicLayoutService());
    await writer.write(workspace, [diagram]);

    const graph = JSON.parse(
      await readFile(join(root.rootPath, 'landscape', 'graph.json'), 'utf8')
    ) as {
      readonly elements: { readonly nodes: readonly { readonly data: Record<string, unknown> }[] };
    };
    const viewer = await readFile(join(root.rootPath, 'landscape', 'index.html'), 'utf8');
    const nodes = new Map(graph.elements.nodes.map((node) => [node.data.id, node.data]));

    expect(nodes.get('directory:%40demo%2Fapp:features')).toMatchObject({
      compound: true,
      parent: 'package:%40demo%2Fapp'
    });
    expect(nodes.get('feature')).toMatchObject({
      parent: 'directory:%40demo%2Fapp:features',
      packageSourcePath: 'src/features/Feature.ts'
    });
    expect(viewer).toContain('id="cy"');
    expect(viewer).toContain('id="atlas-graph"');
    expect(viewer).toContain('<script src="../assets/cytoscape.min.js"></script>');
    expect(viewer).not.toContain('atlas-viewer');
    await expect(writer.readDiagram(workspace, 'landscape')).resolves.toMatchObject({
      scope: 'landscape',
      nodes: [
        expect.objectContaining({
          id: 'feature',
          sourcePath: 'src/demo-app/src/features/Feature.ts'
        })
      ]
    });
  });

  /** Collapses an unbranched Kotlin source namespace relative to its configured source root. */
  it('writes Kotlin namespace compounds relative to the source root', async () => {
    const root = await TemporaryWriterRoot.create();
    const workspace = root.createWorkspace();
    const diagram = new DiagramGraph(
      'landscape',
      'Landscape',
      [
        new DeclarationNode(
          'catalog',
          'Catalog.kt',
          'module',
          '@demo/app',
          'src/demo-app/src/dev/atlas/example/app/Catalog.kt',
          true,
          'kotlin'
        )
      ],
      []
    );
    const writer = new NodeDiagramArtifactWriter(new DeterministicLayoutService());

    await writer.write(workspace, [diagram]);

    const graph = JSON.parse(
      await readFile(join(root.rootPath, 'landscape', 'graph.json'), 'utf8')
    ) as {
      readonly elements: { readonly nodes: readonly { readonly data: Record<string, unknown> }[] };
    };
    const nodes = new Map(graph.elements.nodes.map((node) => [node.data.id, node.data]));

    expect(nodes.get('directory:%40demo%2Fapp:dev%2Fatlas%2Fexample%2Fapp')).toMatchObject({
      label: 'dev.atlas.example.app',
      parent: 'package:%40demo%2Fapp'
    });
    expect(nodes.get('catalog')).toMatchObject({
      parent: 'directory:%40demo%2Fapp:dev%2Fatlas%2Fexample%2Fapp',
      packageSourcePath: 'src/dev/atlas/example/app/Catalog.kt'
    });
  });

  /**
   * Restores the complete graph and matrix interaction surfaces with a copied offline runtime.
   */
  it('writes complete graph and matrix viewers with local depth-aware assets', async () => {
    const root = await TemporaryWriterRoot.create();
    const workspace = root.createWorkspace();
    const nodes = [
      new DeclarationNode(
        'feature',
        'Feature',
        'class',
        '@demo/app',
        'src/demo-app/src/features/Feature.ts',
        false
      ),
      new DeclarationNode(
        'service',
        'Service',
        'interface',
        '@demo/app',
        'src/demo-app/src/services/Service.ts',
        false
      )
    ];
    const relationships = [
      new DeclarationRelationship('feature-service', 'feature', 'service', 'reference')
    ];
    const landscape = new DiagramGraph('landscape', 'Landscape', nodes, relationships);
    const packageDiagram = new DiagramGraph('package:@demo/app', '@demo/app', nodes, relationships);
    const writer = new NodeDiagramArtifactWriter(new DeterministicLayoutService());

    await writer.write(workspace, [packageDiagram, landscape]);

    const [
      rootViewer,
      landscapeViewer,
      packageViewer,
      matrix,
      cytoscapeRuntime,
      graphArtifact,
      layoutArtifact
    ] = await Promise.all([
      readFile(join(root.rootPath, 'index.html'), 'utf8'),
      readFile(join(root.rootPath, 'landscape', 'index.html'), 'utf8'),
      readFile(
        join(root.rootPath, 'packages', encodeURIComponent('@demo/app'), 'index.html'),
        'utf8'
      ),
      readFile(join(root.rootPath, 'landscape', 'matrix.html'), 'utf8'),
      readFile(join(root.rootPath, 'assets', 'cytoscape.min.js'), 'utf8'),
      readFile(join(root.rootPath, 'landscape', 'graph.json'), 'utf8'),
      readFile(join(root.rootPath, 'landscape', 'layout.json'), 'utf8')
    ]);

    expect(rootViewer).toContain('<script src="assets/cytoscape.min.js"></script>');
    expect(landscapeViewer).toContain('<script src="../assets/cytoscape.min.js"></script>');
    expect(packageViewer).toContain('<script src="../../assets/cytoscape.min.js"></script>');
    expect(rootViewer).toContain('"layoutPath": "landscape/layout.json"');
    expect(landscapeViewer).toContain('"layoutPath": "layout.json"');
    expect(packageViewer).toContain('"layoutPath": "layout.json"');
    expect(cytoscapeRuntime).toContain('cytoscape');
    expect(JSON.parse(graphArtifact)).not.toHaveProperty('layoutPath');
    expect(JSON.parse(graphArtifact)).not.toHaveProperty('pagePaths');
    expect(JSON.parse(layoutArtifact)).not.toHaveProperty('graphPath');
    expect(JSON.parse(layoutArtifact)).not.toHaveProperty('viewer');

    for (const controlId of [
      'atlas-search',
      'atlas-filter-both',
      'atlas-filter-inbound',
      'atlas-filter-outbound',
      'atlas-clear-selection',
      'atlas-externals',
      'atlas-hidden-connections',
      'atlas-create-folder',
      'atlas-export-png',
      'atlas-export-all',
      'atlas-dark-mode',
      'atlas-fit',
      'atlas-collapse-group',
      'atlas-hide-selected',
      'atlas-split-externals',
      'atlas-auto-layout',
      'atlas-orientation',
      'atlas-rows',
      'atlas-horizontal-gap',
      'atlas-vertical-gap',
      'atlas-snap',
      'atlas-snap-grid',
      'atlas-excluded-toggle'
    ]) {
      expect(landscapeViewer).toContain(`id="${controlId}"`);
    }
    for (const viewer of [rootViewer, landscapeViewer, packageViewer, matrix]) {
      expect(viewer).not.toContain('atlas-viewer');
      expect(viewer).not.toContain('unpkg.com');
    }

    expect(matrix).toContain('aria-label="Dependency graph metrics"');
    expect(matrix).toContain('<span class="metric-label">Declarations</span>');
    expect(matrix).toContain('<span class="metric-label">Dependencies</span>');
    expect(matrix).toContain('<span class="metric-label">Density</span>');
    expect(matrix).toContain('<span class="metric-label">Cycle groups</span>');
    expect(matrix).toContain('<span class="metric-value">50.00%</span>');
    expect(matrix).toContain('aria-label="Dependency matrix"');
    expect(matrix).toContain('href="/landscape/index.html">Diagram</a>');
    expect(matrix).toContain('href="/packages/%40demo%2Fapp/matrix.html">Matrix</a>');
    expect(matrix).toContain(
      'class="navigation-link current" href="/landscape/matrix.html">Matrix</a>'
    );
    expect(landscapeViewer).toContain(
      "function selectedLeafNodes(selected) { return selectedContents(selected).filter(':childless'); }"
    );
    expect(landscapeViewer).toContain('const directRelationships = inbound.union(outbound);');
    expect(landscapeViewer).toContain(
      'contents.union(selected.ancestors()).union(directRelationships).union(directNodes).union(directNodes.ancestors())'
    );
    expect(landscapeViewer).toContain("full: true, output: 'blob', scale: 1");
    expect(landscapeViewer).toContain('window.exportAllDiagramImages = exportAllImages;');
    expect(landscapeViewer).not.toContain('full: false');
    expect(landscapeViewer).not.toContain('maxWidth:');
    expect(landscapeViewer).not.toContain('maxHeight:');
  });

  /**
   * Keeps the artifact-root viewer path correct when only the landscape scope is rewritten.
   */
  it('writes artifact-root and scoped viewer paths during a landscape scope update', async () => {
    const root = await TemporaryWriterRoot.create();
    const workspace = root.createWorkspace();
    const landscape = new DiagramGraph(
      'landscape',
      'Landscape',
      [
        new DeclarationNode(
          'feature',
          'Feature',
          'class',
          '@demo/app',
          'src/demo-app/src/features/Feature.ts',
          false
        )
      ],
      []
    );
    const writer = new NodeDiagramArtifactWriter(new DeterministicLayoutService());

    await writer.writeScope(workspace, landscape, [landscape]);

    const [rootViewer, scopedViewer] = await Promise.all([
      readFile(join(root.rootPath, 'index.html'), 'utf8'),
      readFile(join(root.rootPath, 'landscape', 'index.html'), 'utf8')
    ]);
    expect(rootViewer).toContain('<script src="assets/cytoscape.min.js"></script>');
    expect(scopedViewer).toContain('<script src="../assets/cytoscape.min.js"></script>');
    expect(rootViewer).toContain('"scope": "landscape"');
    expect(rootViewer).toContain('"layoutPath": "landscape/layout.json"');
    expect(scopedViewer).toContain('"layoutPath": "layout.json"');
    expect(rootViewer).not.toContain('?graph=graph.json');
  });

  /**
   * Persists presentation group artifacts under their own stable group directory.
   */
  it('writes and reloads group scopes through the stable group directory', async () => {
    const root = await TemporaryWriterRoot.create();
    const workspace = root.createWorkspace();
    const diagram = new DiagramGraph(
      'group:application',
      'Application',
      [new DeclarationNode('service', 'Service', 'class', '@demo/app', 'src/service.ts', false)],
      []
    );
    const writer = new NodeDiagramArtifactWriter(new DeterministicLayoutService());

    await writer.write(workspace, [diagram]);

    await expect(
      access(join(root.rootPath, 'groups', 'application', 'graph.json'))
    ).resolves.toBeUndefined();
    await expect(writer.readDiagram(workspace, 'group:application')).resolves.toMatchObject({
      scope: 'group:application',
      title: 'Application'
    });
  });
});
