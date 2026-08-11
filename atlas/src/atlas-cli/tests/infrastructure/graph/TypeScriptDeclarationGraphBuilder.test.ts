import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { TypeScriptDeclarationGraphBuilder } from '#infrastructure/graph/TypeScriptDeclarationGraphBuilder.js';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Verifies compiler-backed declaration and semantic relationship discovery.
 */
describe('TypeScriptDeclarationGraphBuilder', () => {
  /**
   * Verifies supported declaration categories, inheritance, references, module aggregation, and Node external normalization.
   */
  it('builds a stable semantic graph for supported top-level declarations', async () => {
    const workspaceRootPath = resolve('tests/fixtures/semantic-graph');
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: {
        packages: [{ match: { name: '@atlas-fixture/semantic-graph' }, classification: 'runtime' }]
      }
    };
    const workspacePackage = new WorkspacePackage(
      '@atlas-fixture/semantic-graph',
      workspaceRootPath,
      '.',
      [resolve(workspaceRootPath, 'src')],
      'runtime',
      [],
      resolve(workspaceRootPath, 'tsconfig.json')
    );
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        workspaceRootPath,
        resolve(workspaceRootPath, 'atlas.config.yml'),
        resolve(workspaceRootPath, 'architecture')
      ),
      configuration,
      [workspacePackage]
    );

    const graph = await new TypeScriptDeclarationGraphBuilder().build(workspace);

    expect(graph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(['class', 'interface', 'type-alias', 'enum', 'module', 'external'])
    );
    expect(graph.nodes.some((node) => node.id === 'external:node:fs')).toBe(true);
    expect(graph.relationships.some((relationship) => relationship.type === 'inheritance')).toBe(
      true
    );
    expect(graph.relationships.some((relationship) => relationship.type === 'reference')).toBe(
      true
    );
    expect(
      graph.relationships.some(
        (relationship) =>
          relationship.sourceId.includes('ReExportConsumer') &&
          relationship.targetId.includes('BaseContract') &&
          relationship.type === 'inheritance'
      )
    ).toBe(true);
    expect(
      graph.relationships.some(
        (relationship) =>
          relationship.sourceId.includes('AliasConsumer') &&
          relationship.targetId.includes('BaseContract') &&
          relationship.type === 'inheritance'
      )
    ).toBe(true);
  });
});
