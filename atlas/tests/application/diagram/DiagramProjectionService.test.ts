import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import {
  DeclarationGraph,
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { describe, expect, it } from 'vitest';

/**
 * Verifies configuration-driven landscape, package, and folder graph projection behavior.
 */
describe('DiagramProjectionService', () => {
  /**
   * Verifies exclusions, importer-specific external splitting, and direct folder boundary projection.
   */
  it('projects configured folder scopes and shapes external dependencies deterministically', () => {
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] },
      diagrams: {
        excludeExternalDependencies: ['hidden-package'],
        splitExternalDependenciesByImporter: true,
        packages: [{ packageName: '@demo/app', excludeSourceGlobs: ['src/excluded/**'] }],
        folders: [{ packageName: '@demo/app', path: 'src/in' }]
      }
    };
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        '/workspace',
        '/workspace/atlas.config.json',
        '/workspace/architecture'
      ),
      configuration,
      [
        new WorkspacePackage(
          '@demo/app',
          '/workspace',
          '.',
          ['/workspace/src'],
          'runtime',
          [],
          undefined
        )
      ]
    );
    const graph = new DeclarationGraph(
      [
        new DeclarationNode('in', 'Inside', 'class', '@demo/app', 'src/in/inside.ts', false),
        new DeclarationNode('out', 'Outside', 'class', '@demo/app', 'src/outside.ts', false),
        new DeclarationNode(
          'excluded',
          'Excluded',
          'class',
          '@demo/app',
          'src/excluded/value.ts',
          false
        ),
        new DeclarationNode('external:fs', 'node:fs', 'external', undefined, undefined, false),
        new DeclarationNode(
          'external:hidden',
          'hidden-package',
          'external',
          undefined,
          undefined,
          false
        )
      ],
      [
        new DeclarationRelationship('in-out', 'in', 'out', 'reference'),
        new DeclarationRelationship('in-fs', 'in', 'external:fs', 'reference'),
        new DeclarationRelationship('in-hidden', 'in', 'external:hidden', 'reference')
      ]
    );

    const diagrams = new DiagramProjectionService().project(workspace, graph);
    const landscape = diagrams.find((diagram) => diagram.scope === 'landscape');
    const folder = diagrams.find((diagram) => diagram.scope === 'folder:@demo/app:src/in');

    expect(landscape?.nodes.map((node) => node.id)).not.toContain('excluded');
    expect(landscape?.nodes.map((node) => node.id)).not.toContain('external:hidden');
    expect(landscape?.nodes.map((node) => node.id)).toContain('external:fs:importer:%40demo%2Fapp');
    expect(folder?.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['in', 'boundary:out', 'external:fs'])
    );
    expect(folder?.nodes.map((node) => node.id)).not.toContain('out');
    expect(folder?.relationships).toHaveLength(2);
  });

  /**
   * Verifies disabled external collapsing gives each importing declaration its own stable external target.
   */
  it('expands external dependencies when collapsing is disabled', () => {
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths('/workspace', '/workspace/atlas.config.json', '/workspace/out'),
      {
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] },
        diagrams: { collapseExternalDependencies: false }
      },
      [
        new WorkspacePackage(
          '@demo/app',
          '/workspace',
          '.',
          ['/workspace/src'],
          'runtime',
          [],
          undefined
        )
      ]
    );
    const graph = new DeclarationGraph(
      [
        new DeclarationNode('left', 'Left', 'class', '@demo/app', 'src/left.ts', false),
        new DeclarationNode('right', 'Right', 'class', '@demo/app', 'src/right.ts', false),
        new DeclarationNode('external:fs', 'node:fs', 'external', undefined, undefined, false)
      ],
      [
        new DeclarationRelationship('left-fs', 'left', 'external:fs', 'reference'),
        new DeclarationRelationship('right-fs', 'right', 'external:fs', 'reference')
      ]
    );

    const landscape = new DiagramProjectionService()
      .project(workspace, graph)
      .find((diagram) => diagram.scope === 'landscape');

    expect(landscape?.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['external:fs:source:left', 'external:fs:source:right'])
    );
    expect(landscape?.nodes.map((node) => node.id)).not.toContain('external:fs');
  });
});
