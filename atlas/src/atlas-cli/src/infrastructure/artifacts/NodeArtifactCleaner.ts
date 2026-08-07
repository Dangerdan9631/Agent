import type { ArtifactCleaner } from '#application/clean/ports/ArtifactCleaner.js';
import { readdir, rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Removes only direct children under an explicitly resolved Atlas artifact root.
 */
export class NodeArtifactCleaner implements ArtifactCleaner {
  /**
   * Removes every direct artifact-root child while preserving the artifact root directory itself.
   *
   * @param artifactRootPath - Absolute artifact root whose direct children may be removed.
   * @returns Count of direct children removed.
   */
  public async clean(artifactRootPath: string): Promise<number> {
    const rootPath = resolve(artifactRootPath);
    const entries = await readdir(rootPath, { withFileTypes: true }).catch((error: unknown) => {
      if (this.isMissingDirectoryError(error)) {
        return [];
      }
      throw error;
    });
    for (const entry of entries) {
      const childPath = resolve(rootPath, entry.name);
      this.assertContained(rootPath, childPath);
      await rm(childPath, { recursive: true, force: true });
    }
    return entries.length;
  }

  /**
   * Checks whether a filesystem error represents an absent artifact root.
   *
   * @param error - Unknown filesystem operation error.
   * @returns True only for Node's missing-path error code.
   */
  private isMissingDirectoryError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    );
  }

  /**
   * Verifies a resolved deletion target remains a direct descendant of the artifact root.
   *
   * @param rootPath - Resolved artifact root.
   * @param childPath - Resolved deletion target.
   */
  private assertContained(rootPath: string, childPath: string): void {
    const relativePath = relative(rootPath, childPath);
    if (
      relativePath.length === 0 ||
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    ) {
      throw new Error('Atlas refused to remove a path outside its configured artifact root.');
    }
  }
}
