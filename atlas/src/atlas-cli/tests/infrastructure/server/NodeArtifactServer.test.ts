import { NodeArtifactServer } from '#infrastructure/server/NodeArtifactServer.js';
import { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import { JsonAtlasConfigurationLoader } from '#infrastructure/configuration/JsonAtlasConfigurationLoader.js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Creates isolated generated-artifact directories for local HTTP server integration tests.
 */
class TemporaryArtifactRoot {
  /**
   * Holds roots allocated by the current test suite.
   */
  private static readonly roots: string[] = [];

  /**
   * Creates a temporary artifact-root wrapper.
   *
   * @param rootPath - Absolute temporary artifact root path.
   */
  private constructor(public readonly rootPath: string) {}

  /**
   * Allocates a generated artifact root with one minimal landscape graph.
   *
   * @returns Ready temporary artifact-root wrapper.
   */
  public static async create(): Promise<TemporaryArtifactRoot> {
    const rootPath = await mkdtemp(join(tmpdir(), 'atlas-server-'));
    this.roots.push(rootPath);
    const landscapePath = join(rootPath, 'landscape');
    await writeFile(
      join(rootPath, 'atlas.config.json'),
      JSON.stringify({
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: 'demo' }, classification: 'runtime' }] }
      }),
      'utf8'
    );
    await mkdir(landscapePath);
    await writeFile(join(landscapePath, 'index.html'), '<main>landscape</main>', 'utf8');
    await writeFile(
      join(landscapePath, 'graph.json'),
      JSON.stringify({
        scope: 'landscape',
        title: 'Landscape',
        elements: {
          nodes: [
            { data: { id: 'package:demo', kind: 'package', compound: true } },
            {
              data: {
                id: 'live',
                kind: 'class',
                label: 'Live',
                moduleNode: false,
                packageName: 'demo',
                parent: 'package:demo',
                sourcePath: 'src/live.ts'
              }
            }
          ],
          edges: [
            {
              data: {
                id: 'live-edge',
                relationshipType: 'reference',
                source: 'live',
                target: 'live'
              }
            }
          ]
        }
      }),
      'utf8'
    );
    await writeFile(
      join(landscapePath, 'layout.json'),
      JSON.stringify({ schemaVersion: 1, positions: [], hiddenRelationshipIds: [] }),
      'utf8'
    );
    return new TemporaryArtifactRoot(rootPath);
  }

  /**
   * Removes every allocated temporary artifact root.
   *
   * @returns A promise that resolves after temporary cleanup completes.
   */
  public static async removeAll(): Promise<void> {
    await Promise.all(this.roots.map((rootPath) => rm(rootPath, { recursive: true, force: true })));
    this.roots.length = 0;
  }

  /**
   * Reads the current persisted landscape layout document.
   *
   * @returns Parsed persisted layout JSON.
   */
  public async readLandscapeLayout(): Promise<unknown> {
    return JSON.parse(
      await readFile(join(this.rootPath, 'landscape', 'layout.json'), 'utf8')
    ) as unknown;
  }

  /**
   * Reads the current persisted landscape PNG export.
   *
   * @returns Complete exported PNG bytes.
   */
  public readLandscapePng(): Promise<Buffer> {
    return readFile(join(this.rootPath, 'landscape', 'diagram.png'));
  }

  /**
   * Reads the viewer-mutated configuration document.
   *
   * @returns Parsed current Atlas policy document.
   */
  public async readConfiguration(): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(join(this.rootPath, 'atlas.config.json'), 'utf8')) as Record<
      string,
      unknown
    >;
  }

  /** Reads the exact user-owned configuration text for rollback assertions. */
  public readConfigurationText(): Promise<string> {
    return readFile(join(this.rootPath, 'atlas.config.json'), 'utf8');
  }
}

/**
 * Verifies static containment, policy refresh, and graph-cleaned persistence at the local HTTP boundary.
 */
describe('NodeArtifactServer', () => {
  afterEach(TemporaryArtifactRoot.removeAll.bind(TemporaryArtifactRoot));

  /**
   * Serves safely, refreshes each policy mutation, and removes stale browser-submitted layout state.
   */
  it('serves contained artifacts and safely persists cleaned layout documents', async () => {
    const root = await TemporaryArtifactRoot.create();
    let configurationRefreshCount = 0;
    const server = new NodeArtifactServer(
      new DeterministicLayoutService(),
      new JsonAtlasConfigurationLoader()
    );
    const location = await server.start(
      root.rootPath,
      '127.0.0.1',
      0,
      join(root.rootPath, 'atlas.config.json'),
      {
        execute: () => {
          configurationRefreshCount += 1;
          return Promise.resolve();
        }
      }
    );
    const origin = new URL(location.url).origin;

    try {
      const pageResponse = await fetch(`${origin}/`);
      const traversalResponse = await fetch(`${origin}/%2e%2e%2fsecret.txt`);
      const layoutResponse = await fetch(`${origin}/api/layout?scope=landscape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: 1,
          positions: [
            { nodeId: 'live', parentId: 'package:demo', x: 10.1239, y: 20 },
            { nodeId: 'stale', x: 1, y: 1 }
          ],
          hiddenRelationshipIds: ['live-edge', 'stale-edge']
        })
      });
      const generatedLayoutResponse = await fetch(`${origin}/api/layout/generate?scope=landscape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, horizontalGap: 24, rows: 1, verticalGap: 12 })
      });
      const malformedGenerationResponse = await fetch(
        `${origin}/api/layout/generate?scope=landscape`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: 0 })
        }
      );
      const configResponse = await fetch(`${origin}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hide-external', value: 'node:fs' })
      });
      const hideSourceResponse = await fetch(`${origin}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hide-source', value: 'src/generated/**' })
      });
      const splitResponse = await fetch(`${origin}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'set-external-splitting', enabled: true })
      });
      const folderResponse = await fetch(`${origin}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create-folder-diagram',
          packageName: 'demo',
          path: 'src/feature'
        })
      });
      const removeSourceResponse = await fetch(`${origin}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remove-source-exclusion', value: 'src/generated/**' })
      });
      const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
      const pngResponse = await fetch(`${origin}/api/png?scope=landscape`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: pngBytes
      });

      expect(pageResponse.status).toBe(200);
      expect(traversalResponse.status).toBe(400);
      expect(layoutResponse.status).toBe(204);
      expect(generatedLayoutResponse.status).toBe(200);
      expect(malformedGenerationResponse.status).toBe(400);
      expect(configResponse.status).toBe(204);
      expect(hideSourceResponse.status).toBe(204);
      expect(splitResponse.status).toBe(204);
      expect(folderResponse.status).toBe(204);
      expect(removeSourceResponse.status).toBe(204);
      expect(configurationRefreshCount).toBe(5);
      await expect(root.readConfiguration()).resolves.toMatchObject({
        diagrams: {
          excludeExternalDependencies: ['node:fs'],
          folders: [{ packageName: 'demo', path: 'src/feature' }],
          splitExternalDependenciesByImporter: true
        }
      });
      expect(pngResponse.status).toBe(204);
      await expect(root.readLandscapeLayout()).resolves.toEqual({
        schemaVersion: 1,
        positions: [{ nodeId: 'live', parentId: 'directory:demo:src', x: 0, y: 0 }],
        hiddenRelationshipIds: ['live-edge']
      });
      await expect(root.readLandscapePng()).resolves.toEqual(pngBytes);
    } finally {
      await server.stop();
    }
  });

  /** Restores the exact policy document when the dependent artifact refresh fails. */
  it('rolls back a policy mutation when regeneration fails', async () => {
    const root = await TemporaryArtifactRoot.create();
    const originalText = await root.readConfigurationText();
    const server = new NodeArtifactServer(
      new DeterministicLayoutService(),
      new JsonAtlasConfigurationLoader()
    );
    const location = await server.start(
      root.rootPath,
      '127.0.0.1',
      0,
      join(root.rootPath, 'atlas.config.json'),
      { execute: () => Promise.reject(new Error('regeneration failed')) }
    );

    try {
      const response = await fetch(`${new URL(location.url).origin}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hide-external', value: 'node:fs' })
      });

      expect(response.status).toBe(400);
      await expect(root.readConfigurationText()).resolves.toBe(originalText);
    } finally {
      await server.stop();
    }
  });
});
