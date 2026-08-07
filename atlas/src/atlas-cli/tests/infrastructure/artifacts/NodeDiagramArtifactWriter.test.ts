import { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import { DeclarationNode } from '#application/graph/model/DeclarationGraph.js';
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
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        root.rootPath,
        join(root.rootPath, 'atlas.config.json'),
        root.rootPath
      ),
      {
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] }
      },
      [
        new WorkspacePackage(
          '@demo/app',
          join(root.rootPath, 'src', 'demo-app'),
          'src/demo-app',
          [join(root.rootPath, 'src', 'demo-app', 'src')],
          'runtime',
          [],
          undefined
        )
      ]
    );
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
      parent: 'directory:%40demo%2Fapp:features'
    });
    expect(viewer).toContain('id="root"');
    expect(viewer).toContain('../viewer/assets/atlas-viewer.js');
    expect(viewer).toContain('?graph=graph.json');
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

  /**
   * Persists presentation group artifacts under their own stable group directory.
   */
  it('writes and reloads group scopes through the stable group directory', async () => {
    const root = await TemporaryWriterRoot.create();
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        root.rootPath,
        join(root.rootPath, 'atlas.config.json'),
        root.rootPath
      ),
      {
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] }
      },
      [new WorkspacePackage('@demo/app', root.rootPath, '.', [], 'runtime', [], undefined)]
    );
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
