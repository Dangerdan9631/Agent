import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasModuleModel } from '#application/federation/model/AtlasModuleModel.js';
import { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import { ManifestWorkspacePackageResolver } from '#infrastructure/federation/ManifestWorkspacePackageResolver.js';
import { PackagePolicySelector } from '#infrastructure/workspace/PackagePolicySelector.js';
import { describe, expect, it } from 'vitest';

/**
 * Verifies portable module identities receive explicit workspace classification policy.
 */
describe('ManifestWorkspacePackageResolver', () => {
  /**
   * Classifies Kotlin-style artifact IDs while retaining module-local source path semantics.
   */
  it('creates logical packages from manifest-selected modules', async () => {
    const fixture = new ManifestModuleFixture();
    const workspace = new ResolvedAtlasWorkspace(
      new Map([
        ['dev.example:app:1.0.0', fixture.create('dev.example:app:1.0.0')],
        ['dev.example:test-support:1.0.0', fixture.create('dev.example:test-support:1.0.0')]
      ]),
      []
    );
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: {
        packages: [
          {
            match: { name: 'dev.example:app:*' },
            classification: 'runtime',
            classes: ['application']
          },
          {
            match: { name: 'dev.example:test-support:*' },
            classification: 'support',
            classes: ['testing', 'support']
          }
        ]
      }
    };

    const packages = await new ManifestWorkspacePackageResolver(
      new FixedAtlasWorkspaceLoader(workspace),
      new PackagePolicySelector()
    ).resolve('/workspace/models/atlas.manifest.yml', '/workspace', configuration);

    expect(packages.map((workspacePackage) => workspacePackage.name)).toEqual([
      'dev.example:app:1.0.0',
      'dev.example:test-support:1.0.0'
    ]);
    expect(packages[0]).toMatchObject({
      rootPath: '/workspace',
      relativeRootPath: '.',
      sourceRootPaths: [],
      classification: 'runtime',
      classes: ['application']
    });
    expect(packages[1]).toMatchObject({
      classification: 'support',
      classes: ['support', 'testing']
    });
  });
});

/**
 * Supplies a fixed resolved manifest workspace to isolate classification behavior.
 */
class FixedAtlasWorkspaceLoader implements AtlasWorkspaceLoader {
  /**
   * Creates a loader that returns one immutable workspace.
   *
   * @param workspace - Resolved portable models returned for every request.
   */
  public constructor(private readonly workspace: ResolvedAtlasWorkspace) {}

  /**
   * Returns the configured workspace without reading the filesystem.
   *
   * @returns Fixed resolved workspace.
   */
  public load(): Promise<ResolvedAtlasWorkspace> {
    return Promise.resolve(this.workspace);
  }
}

/**
 * Creates minimal language-neutral module models for manifest classification tests.
 */
class ManifestModuleFixture {
  /**
   * Creates one Kotlin-style module with a module-local source path.
   *
   * @param moduleId - Opaque artifact identity.
   * @returns Schema-shaped module model.
   */
  public create(moduleId: string): AtlasModuleModel {
    return {
      schemaVersion: 1,
      generatorVersion: 'atlas-kt-test',
      module: {
        id: moduleId,
        displayName: moduleId,
        version: '1.0.0',
        category: 'gradle-jvm-artifact'
      },
      sourceLanguage: 'kotlin',
      elements: [
        {
          id: `${moduleId}|source-unit`,
          name: 'Application.kt',
          kind: 'source-unit',
          qualifiedName: 'dev.example.Application',
          sourcePath: 'src/main/kotlin/dev/example/Application.kt'
        }
      ],
      relationships: []
    };
  }
}
