import path from 'node:path';

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
