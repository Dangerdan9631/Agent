import type { AtlasConfigurationError } from '#infrastructure/configuration/AtlasConfigurationError.js';
import { YamlAtlasConfigurationLoader } from '#infrastructure/configuration/YamlAtlasConfigurationLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Creates and removes isolated configuration documents for infrastructure tests.
 */
class TemporaryConfigurationDirectory {
  /**
   * Holds directories created during the current test suite.
   */
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
   * Writes a YAML configuration document under the temporary directory.
   *
   * @param document - Serializable configuration document value.
   * @returns Absolute path to the written configuration file.
   */
  public async write(document: unknown): Promise<string> {
    const configurationPath = join(this.directoryPath, 'atlas.config.yml');
    await writeFile(configurationPath, new YamlDocumentCodec().stringify(document), 'utf8');
    return configurationPath;
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
 * Verifies YAML document and JSON Schema validation at the configuration infrastructure boundary.
 */
describe('YamlAtlasConfigurationLoader', () => {
  afterEach(TemporaryConfigurationDirectory.removeAll.bind(TemporaryConfigurationDirectory));

  /**
   * Verifies that a valid explicit package policy becomes a typed configuration model.
   */
  it('loads a valid canonical configuration', async () => {
    const temporaryDirectory = await TemporaryConfigurationDirectory.create();
    const configurationPath = await temporaryDirectory.write({
      schemaVersion: 1,
      discovery: {
        packages: [
          {
            match: { name: '@demo/*' },
            classification: 'runtime',
            sourceRoots: ['src']
          }
        ]
      },
      layout: { rows: 4, horizontalGap: 20, verticalGap: 10 },
      diagrams: {
        excludeSourceGlobs: ['**/*.test.ts'],
        packages: [{ packageName: '@demo/app', excludeSourceGlobs: ['src/generated/**'] }],
        folders: [{ packageName: '@demo/app', path: 'src/application' }]
      }
    });

    const configuration = await new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(
      configurationPath
    );

    expect(configuration.discovery.packages[0]?.classification).toBe('runtime');
    expect(configuration.layout?.rows).toBe(4);
    expect(configuration.diagrams?.folders?.[0]?.path).toBe('src/application');
    expect(configuration.diagrams?.packages?.[0]?.excludeSourceGlobs).toEqual(['src/generated/**']);
  });

  /**
   * Verifies that unrecognized policy fields fail with an actionable schema error.
   */
  it('rejects unrecognized configuration fields', async () => {
    const temporaryDirectory = await TemporaryConfigurationDirectory.create();
    const configurationPath = await temporaryDirectory.write({
      schemaVersion: 1,
      discovery: { packages: [] },
      unsupported: true
    });

    await expect(
      new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(configurationPath)
    ).rejects.toEqual(
      expect.objectContaining<Partial<AtlasConfigurationError>>({
        name: 'AtlasConfigurationError'
      })
    );
  });

  /**
   * Verifies that path traversal in an opt-in folder diagram is rejected by the canonical schema.
   */
  it('rejects folder diagram paths that escape their configured package root', async () => {
    const temporaryDirectory = await TemporaryConfigurationDirectory.create();
    const configurationPath = await temporaryDirectory.write({
      schemaVersion: 1,
      discovery: {
        packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }]
      },
      diagrams: {
        folders: [{ packageName: '@demo/app', path: '../private' }]
      }
    });

    await expect(
      new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(configurationPath)
    ).rejects.toEqual(
      expect.objectContaining<Partial<AtlasConfigurationError>>({
        name: 'AtlasConfigurationError'
      })
    );
  });

  /**
   * Verifies presentation groups receive unique stable identities for diagram and layout persistence.
   */
  it('rejects duplicate module group IDs', async () => {
    const temporaryDirectory = await TemporaryConfigurationDirectory.create();
    const configurationPath = await temporaryDirectory.write({
      schemaVersion: 1,
      discovery: {
        packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }]
      },
      diagrams: {
        moduleGroups: [
          { id: 'application', title: 'Application', moduleIdPatterns: ['@demo/*'] },
          { id: 'application', title: 'Duplicate', moduleIdPatterns: ['@other/*'] }
        ]
      }
    });

    await expect(
      new YamlAtlasConfigurationLoader(new YamlDocumentCodec()).load(configurationPath)
    ).rejects.toThrow("Module group ID 'application' must be unique.");
  });
});
