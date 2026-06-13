import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Locates the toolkit package root by walking upward from a built file location.
 *
 * @param startDir - Directory to begin searching from. Must be inside the toolkit package.
 * @returns Absolute path to the package root containing the Spec-N-Roll package.json.
 */
export function findToolkitPackageRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const packageJsonPath = path.join(current, 'package.json');

    if (existsSync(packageJsonPath)) {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
      if (pkg.name === 'spec-n-roll') {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate Spec-N-Roll package root from ${startDir}.`);
    }
    current = parent;
  }
}

/**
 * Checks whether the current module URL matches the script path Node was asked
 * to execute, with a filename fallback for Windows entrypoints.
 *
 * @param argvEntry - `process.argv[1]` from the current process. Undefined means the module was imported.
 * @param moduleUrl - `import.meta.url` from the module performing the check.
 * @param expectedFilenames - Optional entry filenames allowed to run this module.
 * @returns True when the module should run as the process entrypoint.
 */
export function isCurrentModuleEntrypoint(
  argvEntry: string | undefined,
  moduleUrl: string,
  expectedFilenames?: readonly string[],
): boolean {
  if (argvEntry == null) {
    return false;
  }

  const resolvedArgvEntry = path.resolve(argvEntry);
  const resolvedModulePath = path.resolve(fileURLToPath(moduleUrl));
  const argvFilename = path.basename(resolvedArgvEntry);

  if (expectedFilenames != null && !expectedFilenames.includes(argvFilename)) {
    return false;
  }

  if (resolvedArgvEntry === resolvedModulePath) {
    return true;
  }

  return (
    path.basename(resolvedArgvEntry) === path.basename(resolvedModulePath) &&
    path.basename(path.dirname(resolvedArgvEntry)) ===
      path.basename(path.dirname(resolvedModulePath))
  );
}

/**
 * Builds the relative path to a task spec directory from its id and slug.
 *
 * @param taskSpecId - Zero-padded numeric task spec id (e.g. `001`).
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Project-relative path such as `specs/001-sample-feature`.
 */
export function taskSpecRelativeDir(taskSpecId: string, slug: string): string {
  return path.posix.join('specs', `${taskSpecId}-${slug}`);
}

/**
 * Resolves the absolute task spec directory for a project root and task identity.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Absolute path to the task spec directory.
 */
export function taskSpecDir(projectRoot: string, taskSpecId: string, slug: string): string {
  return path.join(projectRoot, taskSpecRelativeDir(taskSpecId, slug));
}

/**
 * Resolves the absolute path to a file inside a task spec directory.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param filename - File name within the task spec directory (e.g. `spec.md`).
 * @returns Absolute path to the requested artifact.
 */
export function taskSpecFilePath(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  filename: string,
): string {
  return path.join(taskSpecDir(projectRoot, taskSpecId, slug), filename);
}
