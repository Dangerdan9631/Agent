import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Verifies configured module models are validated and linked only by stable artifact identities.
 */
describe('NodeAtlasWorkspaceLoader', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true }))
    );
  });

  /**
   * Resolves matching targets while retaining unavailable artifacts as ordinary external dependencies.
   */
  it('links selected models independently of source language and preserves missing dependencies', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-federation-'));
    temporaryDirectories.push(directory);
    const fixture = new FederationModelFixture();
    const codec = new YamlDocumentCodec();
    await writeFile(
      resolve(directory, 'one.atlas.module.yml'),
      codec.stringify(
        fixture.create('one', 'future-language', 'one-element', {
          moduleId: 'two',
          elementId: 'two-element'
        })
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'two.atlas.module.yml'),
      codec.stringify(
        fixture.create('two', 'kotlin', 'two-element', {
          moduleId: 'missing',
          label: 'Missing Artifact'
        })
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'atlas.manifest.yml'),
      codec.stringify({
        schemaVersion: 1,
        modules: [
          { moduleId: 'one', modelPath: 'one.atlas.module.yml' },
          { moduleId: 'two', modelPath: 'two.atlas.module.yml' }
        ]
      }),
      'utf8'
    );

    const workspace = await new NodeAtlasWorkspaceLoader(codec).load(
      resolve(directory, 'atlas.manifest.yml')
    );

    expect(workspace.modules.size).toBe(2);
    expect(workspace.relationships[0]?.targetModule?.module.id).toBe('two');
    expect(workspace.relationships[0]?.targetElementId).toBe('two-element');
    expect(workspace.relationships[1]?.targetModule).toBeUndefined();
    expect(workspace.relationships[1]?.targetElementId).toBeUndefined();
  });

  /**
   * Rejects a stale element identity when its explicitly selected target module is available.
   */
  it('rejects unknown elements in selected target modules', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-federation-'));
    temporaryDirectories.push(directory);
    const fixture = new FederationModelFixture();
    const codec = new YamlDocumentCodec();
    await writeFile(
      resolve(directory, 'one.atlas.module.yml'),
      codec.stringify(
        fixture.create('one', 'typescript', 'one-element', {
          moduleId: 'two',
          elementId: 'stale-two-element'
        })
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'two.atlas.module.yml'),
      codec.stringify(fixture.create('two', 'kotlin', 'two-element', { label: 'external' })),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'atlas.manifest.yml'),
      codec.stringify({
        schemaVersion: 1,
        modules: [
          { moduleId: 'one', modelPath: 'one.atlas.module.yml' },
          { moduleId: 'two', modelPath: 'two.atlas.module.yml' }
        ]
      }),
      'utf8'
    );

    await expect(
      new NodeAtlasWorkspaceLoader(codec).load(resolve(directory, 'atlas.manifest.yml'))
    ).rejects.toThrow("targets unknown element 'stale-two-element'");
  });

  /**
   * Rejects relationship IDs that collide across independently generated module models.
   */
  it('rejects duplicate relationship identities across selected modules', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-federation-'));
    temporaryDirectories.push(directory);
    const fixture = new FederationModelFixture();
    const codec = new YamlDocumentCodec();
    await writeFile(
      resolve(directory, 'one.atlas.module.yml'),
      codec.stringify(
        fixture.create('one', 'typescript', 'one-element', { label: 'external' }, 'shared')
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'two.atlas.module.yml'),
      codec.stringify(
        fixture.create('two', 'kotlin', 'two-element', { label: 'external' }, 'shared')
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'atlas.manifest.yml'),
      codec.stringify({
        schemaVersion: 1,
        modules: [
          { moduleId: 'one', modelPath: 'one.atlas.module.yml' },
          { moduleId: 'two', modelPath: 'two.atlas.module.yml' }
        ]
      }),
      'utf8'
    );

    await expect(
      new NodeAtlasWorkspaceLoader(codec).load(resolve(directory, 'atlas.manifest.yml'))
    ).rejects.toThrow("duplicate relationship ID 'shared'");
  });

  /** Skips only absent configured outputs while retaining ordered loaded module policy. */
  it('loads the configured version-two subset and reports missing model paths', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);
    const codec = new YamlDocumentCodec();
    await writeFile(
      resolve(directory, 'present.atlas.module.yml'),
      codec.stringify(new VersionTwoModelFixture().create('present')),
      'utf8'
    );

    const workspace = await new NodeAtlasWorkspaceLoader(codec).loadConfigured(directory, [
      { model: 'present.atlas.module.yml', tags: ['loaded'] },
      { model: 'missing.atlas.module.yml', tags: ['absent'] }
    ]);

    expect([...workspace.workspace.modules.keys()]).toEqual(['present']);
    expect(workspace.missingModelPaths).toEqual(['missing.atlas.module.yml']);
    expect(workspace.modulesById.get('present')?.tags).toEqual(['loaded']);
  });

  /** Rejects a project whose complete configured model subset is absent. */
  it('rejects a zero-model configured result', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);

    await expect(
      new NodeAtlasWorkspaceLoader(new YamlDocumentCodec()).loadConfigured(directory, [
        { model: 'missing.atlas.module.yml' }
      ])
    ).rejects.toThrow('could not load any configured generated module models');
  });

  /** Treats malformed present generated output as an error rather than a missing model. */
  it('rejects an invalid present configured model', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);
    await writeFile(resolve(directory, 'invalid.atlas.module.yml'), 'schemaVersion: 2\n', 'utf8');

    await expect(
      new NodeAtlasWorkspaceLoader(new YamlDocumentCodec()).loadConfigured(directory, [
        { model: 'invalid.atlas.module.yml' }
      ])
    ).rejects.toThrow('is invalid');
  });

  /** Preserves normalized version-two relationship kinds beyond the legacy compatibility subset. */
  it('loads the complete version-two relationship vocabulary', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);
    const codec = new YamlDocumentCodec();
    const model = new VersionTwoModelFixture().create('present') as Record<string, unknown>;
    model.relationships = [
      {
        id: 'export',
        sourceElementId: 'element',
        kind: 'exports',
        target: { type: 'external', id: 'public-api' }
      }
    ];
    await writeFile(resolve(directory, 'present.atlas.module.yml'), codec.stringify(model), 'utf8');

    const workspace = await new NodeAtlasWorkspaceLoader(codec).loadConfigured(directory, [
      { model: 'present.atlas.module.yml' }
    ]);

    expect(workspace.workspace.relationships[0]?.relationship.kind).toBe('exports');
  });

  /** Preserves source-unit ancestry as source paths when a generator omits optional source spans. */
  it('derives source paths from version-two source-unit parentage', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);
    const codec = new YamlDocumentCodec();
    const model = new VersionTwoModelFixture().create('present') as Record<string, unknown>;
    model.elements = [
      {
        id: 'element',
        kind: 'class',
        name: 'Element',
        qualifiedName: 'Example',
        parentId: 'source-unit',
        visibility: 'public'
      },
      {
        id: 'source-unit',
        kind: 'source-unit',
        name: 'Example.kt',
        qualifiedName: 'src/main/kotlin/Example.kt',
        visibility: 'public'
      }
    ];
    await writeFile(resolve(directory, 'present.atlas.module.yml'), codec.stringify(model), 'utf8');

    const workspace = await new NodeAtlasWorkspaceLoader(codec).loadConfigured(directory, [
      { model: 'present.atlas.module.yml' }
    ]);

    expect(workspace.workspace.modules.get('present')?.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'element', sourcePath: 'src/main/kotlin/Example.kt' })
      ])
    );
  });
});

/**
 * Creates minimal version-two generated documents for configured subset tests.
 */
class VersionTwoModelFixture {
  /**
   * Creates one schema-valid model with deterministic empty relationships.
   *
   * @param moduleId - Opaque source-derived module identity.
   * @returns Minimal version-two module model.
   */
  public create(moduleId: string): object {
    return {
      schemaVersion: 2,
      generator: { name: 'atlas-test', version: '1.0.0' },
      source: { language: 'test' },
      module: { id: moduleId, name: moduleId, version: '1.0.0', category: 'test' },
      elements: [
        {
          id: 'element',
          kind: 'class',
          name: 'Element',
          qualifiedName: 'Element',
          visibility: 'public'
        }
      ],
      relationships: []
    };
  }
}

/**
 * Creates minimal schema-valid model documents for federation loader tests.
 */
class FederationModelFixture {
  /**
   * Creates one minimal valid model with a single external or internal relationship.
   *
   * @param moduleId - Stable artifact module ID.
   * @param sourceLanguage - Arbitrary presentation-only language metadata.
   * @param elementId - Stable owned element ID.
   * @param target - Internal or external relationship target identity.
   * @param relationshipId - Optional stable relationship identity override.
   * @returns YAML-compatible module model value.
   */
  public create(
    moduleId: string,
    sourceLanguage: string,
    elementId: string,
    target: { readonly moduleId?: string; readonly elementId?: string; readonly label?: string },
    relationshipId: string = `${moduleId}-relationship`
  ): object {
    return {
      schemaVersion: 1,
      generatorVersion: 'test-1',
      module: { id: moduleId, displayName: moduleId, version: '1.0.0', category: 'test' },
      sourceLanguage,
      elements: [{ id: elementId, name: elementId, kind: 'class', qualifiedName: elementId }],
      relationships: [
        {
          id: relationshipId,
          sourceElementId: elementId,
          kind: 'references',
          target
        }
      ]
    };
  }
}
