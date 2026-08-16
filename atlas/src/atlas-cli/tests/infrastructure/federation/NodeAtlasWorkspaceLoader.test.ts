import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Verifies configured module models are loaded exclusively from version-two project policy.
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

  /** Loads declared models in configuration order and retains missing declarations. */
  it('loads the configured version-two subset and reports missing model paths', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);
    const codec = new YamlDocumentCodec();
    await writeFile(
      resolve(directory, 'present.atlas.module.yml'),
      codec.stringify(new ModelFixture().create('present')),
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

  /** Rejects a configuration whose generated model set is entirely absent. */
  it('rejects a zero-model configured result', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-configured-models-'));
    temporaryDirectories.push(directory);

    await expect(
      new NodeAtlasWorkspaceLoader(new YamlDocumentCodec()).loadConfigured(directory, [
        { model: 'missing.atlas.module.yml' }
      ])
    ).rejects.toThrow('could not load any configured generated module models');
  });

  /** Treats malformed declared model files as an error rather than an absent output. */
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
});

/**
 * Creates minimal schema-valid version-two generated models for configured-loading tests.
 */
class ModelFixture {
  /**
   * Creates one model with a deterministic single declaration.
   *
   * @param moduleId - Opaque generated module identity.
   * @returns Schema-valid module model.
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
