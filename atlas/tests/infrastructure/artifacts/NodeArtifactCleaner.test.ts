import { NodeArtifactCleaner } from '#infrastructure/artifacts/NodeArtifactCleaner.js';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Allocates isolated artifact roots for cleanup boundary tests.
 */
class TemporaryCleanupRoot {
  /**
   * Holds allocated temporary roots pending suite cleanup.
   */
  private static readonly roots: string[] = [];

  /**
   * Creates a temporary cleanup root wrapper.
   *
   * @param rootPath - Absolute root path permitted for generated artifacts.
   */
  private constructor(public readonly rootPath: string) {}

  /**
   * Allocates a root with nested generated artifacts and a sibling outside the permitted root.
   *
   * @returns Ready cleanup fixture.
   */
  public static async create(): Promise<TemporaryCleanupRoot> {
    const rootPath = await mkdtemp(join(tmpdir(), 'atlas-clean-'));
    this.roots.push(rootPath);
    await mkdir(join(rootPath, 'landscape'));
    await writeFile(join(rootPath, 'landscape', 'graph.json'), '{}', 'utf8');
    await writeFile(join(rootPath, 'navigation.html'), '<nav></nav>', 'utf8');
    await writeFile(`${rootPath}.outside`, 'preserve', 'utf8');
    return new TemporaryCleanupRoot(rootPath);
  }

  /**
   * Removes every allocated fixture root and adjacent outside fixture file.
   *
   * @returns A promise resolving after temporary cleanup completes.
   */
  public static async removeAll(): Promise<void> {
    await Promise.all(
      this.roots.flatMap((rootPath) => [
        rm(rootPath, { recursive: true, force: true }),
        rm(`${rootPath}.outside`, { force: true })
      ])
    );
    this.roots.length = 0;
  }
}

/**
 * Verifies cleanup only removes direct contained artifact-root children.
 */
describe('NodeArtifactCleaner', () => {
  afterEach(TemporaryCleanupRoot.removeAll.bind(TemporaryCleanupRoot));

  /**
   * Removes generated children while retaining both the root and a sibling outside it.
   */
  it('cleans only artifact-root children', async () => {
    const fixture = await TemporaryCleanupRoot.create();

    const removedCount = await new NodeArtifactCleaner().clean(fixture.rootPath);

    expect(removedCount).toBe(2);
    await expect(access(fixture.rootPath)).resolves.toBeUndefined();
    await expect(access(`${fixture.rootPath}.outside`)).resolves.toBeUndefined();
    await expect(access(join(fixture.rootPath, 'landscape'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
  });
});
