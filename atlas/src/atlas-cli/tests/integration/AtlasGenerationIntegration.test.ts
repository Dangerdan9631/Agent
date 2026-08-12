import { AtlasCompositionRoot } from '#composition/AtlasCompositionRoot.js';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Allocates output roots for end-to-end CLI generation tests.
 */
class TemporaryArtifactOutput {
  /**
   * Holds generated output roots pending suite cleanup.
   */
  private static readonly paths: string[] = [];

  /**
   * Creates a wrapper for one generated artifact root.
   *
   * @param path - Absolute output directory path.
   */
  private constructor(public readonly path: string) {}

  /**
   * Allocates an empty output root outside the fixture workspace.
   *
   * @returns Ready output-root wrapper.
   */
  public static async create(): Promise<TemporaryArtifactOutput> {
    const path = await mkdtemp(join(tmpdir(), 'atlas-generation-'));
    this.paths.push(path);
    return new TemporaryArtifactOutput(path);
  }

  /**
   * Removes every generated output root after each test.
   *
   * @returns A promise resolving after cleanup completes.
   */
  public static async removeAll(): Promise<void> {
    await Promise.all(this.paths.map((path) => rm(path, { recursive: true, force: true })));
    this.paths.length = 0;
  }
}

/**
 * Verifies the built application produces the complete artifact set from a clean fixture workspace.
 */
describe('Atlas generation integration', () => {
  afterEach(TemporaryArtifactOutput.removeAll.bind(TemporaryArtifactOutput));

  /**
   * Generates landscape, package, folder, matrix, graph, and raw analysis artifacts through the real CLI composition.
   */
  it('generates every configured artifact scope into an isolated output root', async () => {
    const output = await TemporaryArtifactOutput.create();
    const fixturePath = resolve('tests/fixtures/semantic-graph');

    const exitCode = await new AtlasCompositionRoot()
      .createCli()
      .run(['--workspace', fixturePath, '--output', output.path, 'generate']);

    expect(exitCode).toBe(0);
    await expect(access(join(output.path, 'landscape', 'graph.json'))).resolves.toBeUndefined();
    await expect(access(join(output.path, 'landscape', 'index.html'))).resolves.toBeUndefined();
    await expect(access(join(output.path, 'landscape', 'matrix.html'))).resolves.toBeUndefined();
    await expect(
      access(
        join(
          output.path,
          'modules',
          encodeURIComponent(`${encodeURIComponent('@atlas-fixture/semantic-graph')}:module`),
          'graph.json'
        )
      )
    ).resolves.toBeUndefined();
    await expect(
      access(
        join(
          output.path,
          'modules',
          encodeURIComponent(`${encodeURIComponent('@atlas-fixture/semantic-graph')}:source`),
          'graph.json'
        )
      )
    ).resolves.toBeUndefined();
    await expect(
      access(
        join(output.path, 'analysis', '%40atlas-fixture%2Fsemantic-graph.dependency-cruiser.json')
      )
    ).resolves.toBeUndefined();
    await expect(
      readFile(join(output.path, 'landscape', 'graph.json'), 'utf8')
    ).resolves.not.toContain(output.path);

    const validDiagramExitCode = await new AtlasCompositionRoot()
      .createCli()
      .run([
        '--workspace',
        fixturePath,
        '--output',
        output.path,
        'diagram',
        `module:${encodeURIComponent('@atlas-fixture/semantic-graph')}:module`
      ]);
    const invalidDiagramExitCode = await new AtlasCompositionRoot()
      .createCli()
      .run(['--workspace', fixturePath, '--output', output.path, 'diagram', 'module:missing']);

    expect(validDiagramExitCode).toBe(0);
    expect(invalidDiagramExitCode).toBe(2);
  }, 15000);

  /**
   * Loads four independently generated models and diagrams every explicitly configured artifact.
   */
  it('generates four module models with a landscape and four module diagrams', async () => {
    const output = await TemporaryArtifactOutput.create();
    const fixturePath = resolve('tests/fixtures/federation-four');

    const exitCode = await new AtlasCompositionRoot()
      .createCli()
      .run(['--workspace', fixturePath, '--output', output.path, 'generate']);

    expect(exitCode).toBe(0);
    const moduleIds = [
      '@atlas-fixture/federation-one',
      '@atlas-fixture/federation-two',
      '@atlas-fixture/federation-three',
      '@atlas-fixture/federation-four'
    ];
    await expect(access(join(output.path, 'landscape', 'graph.json'))).resolves.toBeUndefined();
    await Promise.all(
      moduleIds.map((moduleId, index) =>
        expect(
          access(
            join(
              output.path,
              'modules',
              encodeURIComponent(
                `${encodeURIComponent(moduleId)}:${['one', 'two', 'three', 'four'][index]}`
              ),
              'graph.json'
            )
          )
        ).resolves.toBeUndefined()
      )
    );
  }, 15000);
});
