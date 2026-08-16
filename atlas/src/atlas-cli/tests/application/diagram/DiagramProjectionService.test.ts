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
        moduleGroups: [
          {
            id: 'application',
            title: 'Application Modules',
            moduleIdPatterns: ['@demo/*']
          }
        ],
        packages: [{ packageName: '@demo/app', excludeSourceGlobs: ['src/excluded/**'] }],
        folders: [{ packageName: '@demo/app', path: 'src/in' }]
      }
    };
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        '/workspace',
        '/workspace/atlas.config.yml',
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
    const group = diagrams.find((diagram) => diagram.scope === 'group:application');

    expect(landscape?.nodes.map((node) => node.id)).not.toContain('excluded');
    expect(landscape?.nodes.map((node) => node.id)).not.toContain('external:hidden');
    expect(landscape?.nodes.map((node) => node.id)).toContain('external:fs:importer:%40demo%2Fapp');
    expect(folder?.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['in', 'boundary:out', 'external:fs'])
    );
    expect(folder?.nodes.map((node) => node.id)).not.toContain('out');
    expect(folder?.relationships).toHaveLength(2);
    expect(group?.title).toBe('Application Modules');
    expect(group?.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['in', 'out']));
  });

  /**
   * Verifies disabled external collapsing gives each importing declaration its own stable external target.
   */
  it('expands external dependencies when collapsing is disabled', () => {
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths('/workspace', '/workspace/atlas.config.yml', '/workspace/out'),
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

  /**
   * Verifies selected external labels retain collapsed nodes and split only for configured importers.
   */
  it('applies selective external collapse and importer splitting', () => {
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths('/workspace', '/workspace/atlas.config.yml', '/workspace/out'),
      {
        schemaVersion: 1,
        discovery: {
          packages: [
            { match: { name: '@demo/left' }, classification: 'runtime' },
            { match: { name: '@demo/right' }, classification: 'runtime' }
          ]
        },
        diagrams: {
          collapseExternalDependencies: false,
          collapseExternalDependencyGlobs: ['commander'],
          externalDependencyImporterSplits: [
            { dependency: 'commander', packageNames: ['@demo/left'] }
          ]
        }
      },
      [
        new WorkspacePackage(
          '@demo/left',
          '/workspace/left',
          'left',
          ['/workspace/left/src'],
          'runtime',
          [],
          undefined
        ),
        new WorkspacePackage(
          '@demo/right',
          '/workspace/right',
          'right',
          ['/workspace/right/src'],
          'runtime',
          [],
          undefined
        )
      ]
    );
    const graph = new DeclarationGraph(
      [
        new DeclarationNode('left', 'Left', 'class', '@demo/left', 'left/src/left.ts', false),
        new DeclarationNode('right', 'Right', 'class', '@demo/right', 'right/src/right.ts', false),
        new DeclarationNode(
          'external:commander',
          'commander',
          'external',
          undefined,
          undefined,
          false
        ),
        new DeclarationNode('external:lodash', 'lodash', 'external', undefined, undefined, false)
      ],
      [
        new DeclarationRelationship('left-commander', 'left', 'external:commander', 'reference'),
        new DeclarationRelationship('right-commander', 'right', 'external:commander', 'reference'),
        new DeclarationRelationship('right-lodash', 'right', 'external:lodash', 'reference')
      ]
    );

    const landscape = new DiagramProjectionService()
      .project(workspace, graph)
      .find((diagram) => diagram.scope === 'landscape');

    expect(landscape?.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        'external:commander:importer:%40demo%2Fleft',
        'external:commander',
        'external:lodash:source:right'
      ])
    );
    expect(landscape?.nodes.map((node) => node.id)).not.toContain('external:lodash');
  });

  /**
   * Projects configuration-classified modules with module-local Kotlin paths into groups and folders.
   */
  it('projects configured module groups and module-local folder scopes', () => {
    const applicationModuleId = 'dev.example:app:1.0.0';
    const supportModuleId = 'dev.example:test-support:1.0.0';
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths('/workspace', '/workspace/atlas.config.yml', '/workspace/out'),
      {
        schemaVersion: 1,
        discovery: {
          packages: [
            { match: { name: 'dev.example:app:*' }, classification: 'runtime' },
            { match: { name: 'dev.example:test-support:*' }, classification: 'support' }
          ]
        },
        diagrams: {
          moduleGroups: [
            {
              id: 'kotlin-example',
              title: 'Kotlin Example',
              moduleIdPatterns: ['dev.example:*']
            }
          ],
          folders: [
            {
              packageName: applicationModuleId,
              path: 'src/main/kotlin/dev/example/app/feature'
            }
          ]
        }
      },
      [
        new WorkspacePackage(applicationModuleId, '/workspace', '.', [], 'runtime', [], undefined),
        new WorkspacePackage(supportModuleId, '/workspace', '.', [], 'support', [], undefined)
      ]
    );
    const graph = new DeclarationGraph(
      [
        new DeclarationNode(
          'application',
          'ApplicationService',
          'class',
          applicationModuleId,
          'src/main/kotlin/dev/example/app/feature/ApplicationService.kt',
          false,
          'kotlin'
        ),
        new DeclarationNode(
          'support',
          'TestCatalog',
          'class',
          supportModuleId,
          'src/main/kotlin/dev/example/support/TestCatalog.kt',
          false,
          'kotlin'
        )
      ],
      [new DeclarationRelationship('application-support', 'application', 'support', 'reference')]
    );

    const diagrams = new DiagramProjectionService().project(workspace, graph);
    const scopes = diagrams.map((diagram) => diagram.scope);
    const group = diagrams.find((diagram) => diagram.scope === 'group:kotlin-example');
    const folder = diagrams.find(
      (diagram) =>
        diagram.scope === `folder:${applicationModuleId}:src/main/kotlin/dev/example/app/feature`
    );

    expect(scopes).toContain(`package:${applicationModuleId}`);
    expect(scopes).not.toContain(`package:${supportModuleId}`);
    expect(group?.nodes.map((node) => node.id)).toEqual(['application', 'support']);
    expect(folder?.nodes.map((node) => node.id)).toEqual(['application', 'boundary:support']);
  });
});
