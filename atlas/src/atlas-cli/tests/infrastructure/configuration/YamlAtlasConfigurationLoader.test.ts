import type { AtlasConfigurationError } from '#infrastructure/configuration/AtlasConfigurationError.js';
import { YamlAtlasConfigurationLoader } from '#infrastructure/configuration/YamlAtlasConfigurationLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Creates and removes isolated version-two configuration document families.
 */
class TemporaryConfigurationDirectory {
  private static readonly directories: string[] = [];

  /**
   * Creates a temporary directory value after filesystem allocation completes.
   *
   * @param directoryPath - Absolute allocated temporary directory path.
   */
  private constructor(public readonly directoryPath: string) {}

  /**
   * Allocates a fresh temporary directory for one configuration test.
   *
   * @returns Temporary directory wrapper.
   */
  public static async create(): Promise<TemporaryConfigurationDirectory> {
    const directoryPath = await mkdtemp(join(tmpdir(), 'atlas-config-'));
    this.directories.push(directoryPath);
    return new TemporaryConfigurationDirectory(directoryPath);
  }

  /**
   * Writes one YAML document below the temporary project root.
   *
   * @param relativePath - Slash-separated project-relative file path.
   * @param document - Serializable YAML document value.
   * @returns Absolute path to the written document.
   */
  public async write(relativePath: string, document: unknown): Promise<string> {
    const documentPath = join(this.directoryPath, ...relativePath.split('/'));
    await mkdir(dirname(documentPath), { recursive: true });
    await writeFile(documentPath, new YamlDocumentCodec().stringify(document), 'utf8');
    return documentPath;
  }

  /**
   * Removes all temporary directories created by this test suite.
   *
   * @returns A promise that resolves after filesystem cleanup completes.
   */
  public static async removeAll(): Promise<void> {
    await Promise.all(
      this.directories.map((directoryPath) => rm(directoryPath, { recursive: true, force: true }))
    );
    this.directories.length = 0;
  }
}

/**
 * Verifies closed-schema validation and deterministic version-two composition.
 */
describe('YamlAtlasConfigurationLoader', () => {
  afterEach(TemporaryConfigurationDirectory.removeAll.bind(TemporaryConfigurationDirectory));

  /** Verifies ordered base merging and model-root-relative module selection. */
  it('composes base and module fragments into the canonical project model', async () => {
    const project = await TemporaryConfigurationDirectory.create();
    await project.write('config/team.atlas.base.yml', {
      schemaVersion: 2,
      documentType: 'base',
      diagramDefaults: {
        externalDependencies: {
          excludeIds: ['System.*'],
          collapse: { mode: 'matching', ids: ['Microsoft.*'] }
        }
      }
    });
    await project.write('packages/lib/atlas.module.config.yml', {
      schemaVersion: 2,
      documentType: 'module',
      model: 'lib.atlas.module.yml',
      tags: ['core'],
      diagrams: [{ id: 'lib', title: 'Library', scope: { type: 'module' } }]
    });
    const configurationPath = await project.write('atlas.config.yml', {
      schemaVersion: 2,
      documentType: 'root',
      extends: ['config/team.atlas.base.yml'],
      project: {
        name: 'Demo',
        artifacts: { root: 'architecture' },
        diagramDefaults: {
          externalDependencies: {
            excludeIds: ['System.*', 'node:*'],
            collapse: { mode: 'matching', ids: ['@types/*'] }
          }
        }
      },
      modules: [
        'packages/lib/atlas.module.config.yml',
        { model: 'app.atlas.module.yml', tags: ['delivery'] }
      ]
    });

    const configuration = await new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(
      configurationPath
    );

    expect(configuration.schemaVersion).toBe(2);
    expect(configuration.project.artifacts.root).toBe('architecture');
    expect(configuration.project.diagramDefaults?.externalDependencies.excludeIds).toEqual([
      'System.*',
      'node:*'
    ]);
    expect(configuration.project.diagramDefaults?.externalDependencies.collapse?.ids).toEqual([
      'Microsoft.*',
      '@types/*'
    ]);
    expect(configuration.modules.map((module) => module.model)).toEqual([
      'lib.atlas.module.yml',
      'app.atlas.module.yml'
    ]);
  });

  /** Verifies each discriminator selects a closed schema. */
  it('rejects unrecognized root fields', async () => {
    const project = await TemporaryConfigurationDirectory.create();
    const configurationPath = await project.write('atlas.config.yml', {
      schemaVersion: 2,
      documentType: 'root',
      project: { name: 'Demo', artifacts: { root: 'architecture' } },
      modules: [{ model: 'architecture/app.atlas.module.yml' }],
      discovery: {}
    });

    await expect(
      new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(configurationPath)
    ).rejects.toEqual(
      expect.objectContaining<Partial<AtlasConfigurationError>>({
        name: 'AtlasConfigurationError'
      })
    );
  });

  /** Verifies referenced fragments are required and cannot silently produce partial policy. */
  it('rejects a missing configuration fragment', async () => {
    const project = await TemporaryConfigurationDirectory.create();
    const configurationPath = await project.write('atlas.config.yml', {
      schemaVersion: 2,
      documentType: 'root',
      extends: ['config/missing.atlas.base.yml'],
      project: { name: 'Demo', artifacts: { root: 'architecture' } },
      modules: [{ model: 'architecture/app.atlas.module.yml' }]
    });

    await expect(
      new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(configurationPath)
    ).rejects.toThrow("Path 'config/missing.atlas.base.yml' is invalid");
  });

  /** Verifies canonical model identities cannot enter the ordered module list twice. */
  it('rejects duplicate resolved model paths', async () => {
    const project = await TemporaryConfigurationDirectory.create();
    const configurationPath = await project.write('atlas.config.yml', {
      schemaVersion: 2,
      documentType: 'root',
      project: { name: 'Demo', artifacts: { root: 'architecture' } },
      modules: [
        { model: 'architecture/app.atlas.module.yml' },
        { model: 'architecture/app.atlas.module.yml' }
      ]
    });

    await expect(
      new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(configurationPath)
    ).rejects.toThrow(
      "Generated model path 'architecture/app.atlas.module.yml' is configured more than once."
    );
  });
});
