import path from 'node:path';

import fse from 'fs-extra';

/**
 * Named repository workflow fixture scenarios under tests/fixtures/repository-workflows.
 */
export type RepositoryWorkflowFixtureName = 'onboarding-basic' | 'drift-basic' | 'large-repo';

/**
 * Absolute path to the repository workflow fixtures root directory.
 */
export const REPOSITORY_WORKFLOW_FIXTURES_ROOT = path.resolve(
  'tests/fixtures/repository-workflows',
);

/**
 * Registry for temporary project roots copied from repository workflow fixtures.
 */
export interface RepositoryWorkflowFixtureRegistry {
  /**
   * Temporary project roots created during a test file run.
   */
  roots: string[];
  /**
   * Copies a fixture into an isolated temporary project root and registers it for cleanup.
   *
   * @param fixtureName - Fixture scenario identifier under repository-workflows.
   * @param prefix - Unique prefix describing the test case.
   * @returns Absolute path to the copied fixture project root.
   */
  copy: (fixtureName: RepositoryWorkflowFixtureName, prefix: string) => Promise<string>;
  /**
   * Removes all registered temporary project roots.
   *
   * @returns Promise that resolves after best-effort cleanup completes.
   */
  cleanup: () => Promise<void>;
}

/**
 * Resolves the absolute path to a named repository workflow fixture directory.
 *
 * @param fixtureName - Fixture scenario identifier under repository-workflows.
 * @returns Absolute path to the fixture root.
 */
export function resolveRepositoryWorkflowFixture(
  fixtureName: RepositoryWorkflowFixtureName,
): string {
  return path.join(REPOSITORY_WORKFLOW_FIXTURES_ROOT, fixtureName);
}

/**
 * Creates an isolated temporary directory for repository workflow tests.
 *
 * @param prefix - Unique prefix describing the test case.
 * @returns Absolute path to the created temporary project root.
 */
export function createRepositoryWorkflowTempRoot(prefix: string): string {
  return path.resolve(
    'node_modules',
    '.tmp',
    `repository-workflow-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
}

/**
 * Copies a repository workflow fixture into an isolated temporary project root.
 *
 * @param fixtureName - Fixture scenario to copy.
 * @param prefix - Unique prefix describing the test case.
 * @returns Absolute path to the copied fixture project root.
 */
export async function copyRepositoryWorkflowFixture(
  fixtureName: RepositoryWorkflowFixtureName,
  prefix: string,
): Promise<string> {
  const sourceRoot = resolveRepositoryWorkflowFixture(fixtureName);
  const tempRoot = createRepositoryWorkflowTempRoot(`${fixtureName}-${prefix}`);

  await fse.remove(tempRoot);
  await fse.copy(sourceRoot, tempRoot);

  return tempRoot;
}

/**
 * Returns a map of project-relative file paths to UTF-8 contents under a directory.
 *
 * @param directoryPath - Absolute directory path to snapshot.
 * @returns Map of relative file paths to file contents, or an empty map when absent.
 */
export async function snapshotDirectoryContents(
  directoryPath: string,
): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();
  if (!(await fse.pathExists(directoryPath))) {
    return snapshot;
  }

  async function walk(currentPath: string, relativePrefix: string): Promise<void> {
    const entries = await fse.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath =
        relativePrefix.length > 0 ? `${relativePrefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        snapshot.set(relativePath.replace(/\\/g, '/'), await fse.readFile(absolutePath, 'utf8'));
      }
    }
  }

  await walk(directoryPath, '');
  return snapshot;
}

/**
 * Creates a fixture registry that tracks temporary project roots for cleanup.
 *
 * @returns Registry with copy and cleanup helpers for repository workflow tests.
 */
export function createRepositoryWorkflowFixtureRegistry(): RepositoryWorkflowFixtureRegistry {
  const roots: string[] = [];

  return {
    roots,
    async copy(fixtureName, prefix) {
      const tempRoot = await copyRepositoryWorkflowFixture(fixtureName, prefix);
      roots.push(tempRoot);
      return tempRoot;
    },
    async cleanup() {
      while (roots.length > 0) {
        const tempRoot = roots.pop();
        if (tempRoot == null) {
          continue;
        }

        try {
          await fse.remove(tempRoot);
        } catch {
          // Best-effort cleanup.
        }
      }
    },
  };
}
