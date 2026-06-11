import fse from 'fs-extra';

import { CoreMutationError } from './errors.js';
import { parseFrontmatterDocument, serializeFrontmatterDocument } from './frontmatter.js';
import { taskSpecFilePath } from './paths.js';
import { atomicWriteText } from './atomic-write.js';

/**
 * Task spec lifecycle status values stored in `spec.md` YAML frontmatter.
 */
export type TaskSpecLifecycleStatus = 'Active' | 'Complete' | 'Locked';

const LIFECYCLE_STATUSES: ReadonlySet<TaskSpecLifecycleStatus> = new Set([
  'Active',
  'Complete',
  'Locked',
]);

/**
 * Reads the lifecycle status from `spec.md` frontmatter.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Lifecycle status or null when `spec.md` or status is absent.
 */
export async function readTaskSpecStatus(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<TaskSpecLifecycleStatus | null> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const content = await fse.readFile(filePath, 'utf8');
  const { frontmatter } = parseFrontmatterDocument(content);
  const status = frontmatter.status;

  if (typeof status !== 'string' || !LIFECYCLE_STATUSES.has(status as TaskSpecLifecycleStatus)) {
    return null;
  }

  return status as TaskSpecLifecycleStatus;
}

/**
 * Rejects mutations when the task spec lifecycle status is `Locked`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 */
export async function assertTaskSpecWritable(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<void> {
  const status = await readTaskSpecStatus(projectRoot, taskSpecId, slug);
  if (status === 'Locked') {
    throw new CoreMutationError(
      'TASK_SPEC_LOCKED',
      `Task spec ${taskSpecId}-${slug} is Locked and cannot be modified.`,
      'Create a new task spec or clarify an Active spec instead of editing a Locked spec.',
    );
  }
}

/**
 * Result of a lifecycle status transition including previous and new values.
 */
export interface TaskSpecStatusTransition {
  /** Previous lifecycle status, or null when unset. */
  previousStatus: TaskSpecLifecycleStatus | null;
  /** New lifecycle status after the transition. */
  status: TaskSpecLifecycleStatus;
}

/**
 * Sets task spec lifecycle status in `spec.md` frontmatter with transition rules.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param status - Target lifecycle status.
 * @returns Previous and new status values.
 */
export async function setTaskSpecStatus(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  status: TaskSpecLifecycleStatus,
): Promise<TaskSpecStatusTransition> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(filePath))) {
    throw new CoreMutationError(
      'SPEC_MISSING',
      `spec.md does not exist for task spec ${taskSpecId}-${slug}.`,
      'Instantiate the specify step output before setting lifecycle status.',
    );
  }

  const content = await fse.readFile(filePath, 'utf8');
  const document = parseFrontmatterDocument(content);
  const previousStatus =
    typeof document.frontmatter.status === 'string'
      ? (document.frontmatter.status as TaskSpecLifecycleStatus)
      : null;

  if (previousStatus === 'Locked' && status !== 'Locked') {
    throw new CoreMutationError(
      'TASK_SPEC_LOCKED',
      `Task spec ${taskSpecId}-${slug} is Locked and cannot transition to ${status}.`,
      'Locked specs are immutable; create a new task spec for additional work.',
    );
  }

  const nextDocument = serializeFrontmatterDocument({
    frontmatter: { ...document.frontmatter, status },
    body: document.body,
  });
  await atomicWriteText(filePath, nextDocument);

  return { previousStatus, status };
}
