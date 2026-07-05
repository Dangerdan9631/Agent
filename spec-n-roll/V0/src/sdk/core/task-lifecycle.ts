import path from 'node:path';
import fse from 'fs-extra';

import { CoreMutationError } from './errors.js';
import { parseFrontmatterDocument, serializeFrontmatterDocument } from './frontmatter.js';
import { taskSpecFilePath } from './paths.js';
import { atomicWriteText } from './atomic-write.js';

const TASK_SPEC_DIR_PATTERN = /^(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

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

/**
 * Identity of a task spec directory discovered under `specs/`.
 */
export interface TaskSpecDirectoryIdentity {
  /** Zero-padded numeric task spec id. */
  taskSpecId: string;
  /** Kebab-case slug paired with the task spec id. */
  slug: string;
}

/**
 * Lists task spec directories under `specs/` sorted by numeric id.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed task spec identities.
 */
export async function listTaskSpecDirectoryIdentities(
  projectRoot: string,
): Promise<TaskSpecDirectoryIdentity[]> {
  const specsDir = path.join(projectRoot, 'specs');
  if (!(await fse.pathExists(specsDir))) {
    return [];
  }

  const entries = await fse.readdir(specsDir, { withFileTypes: true });
  const identities: TaskSpecDirectoryIdentity[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const match = TASK_SPEC_DIR_PATTERN.exec(entry.name);
    if (match == null) {
      continue;
    }

    identities.push({
      taskSpecId: match[1]!,
      slug: match[2]!,
    });
  }

  return identities.sort((left, right) => left.taskSpecId.localeCompare(right.taskSpecId));
}

/**
 * Resolves the slug for a task spec id by matching a directory under `specs/`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @returns Kebab-case slug paired with the task spec id.
 */
export async function resolveTaskSpecSlug(
  projectRoot: string,
  taskSpecId: string,
): Promise<string> {
  const identities = await listTaskSpecDirectoryIdentities(projectRoot);
  const matches = identities.filter((identity) => identity.taskSpecId === taskSpecId);

  if (matches.length === 0) {
    throw new CoreMutationError(
      'TASK_SPEC_NOT_FOUND',
      `No task spec directory found for id ${taskSpecId}.`,
      `Create a task spec under specs/${taskSpecId}-<slug>/ or verify the id.`,
    );
  }

  if (matches.length > 1) {
    const slugs = matches.map((identity) => identity.slug).join(', ');
    throw new CoreMutationError(
      'TASK_SPEC_AMBIGUOUS',
      `Multiple task spec directories found for id ${taskSpecId}: ${slugs}.`,
      'Only one directory per task spec id is supported.',
    );
  }

  return matches[0]!.slug;
}

/**
 * Transitions every Complete task spec in the project to Locked.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Task spec identities that were locked.
 */
export async function lockCompleteTaskSpecs(
  projectRoot: string,
): Promise<TaskSpecDirectoryIdentity[]> {
  const identities = await listTaskSpecDirectoryIdentities(projectRoot);
  const locked: TaskSpecDirectoryIdentity[] = [];

  for (const identity of identities) {
    const status = await readTaskSpecStatus(projectRoot, identity.taskSpecId, identity.slug);
    if (status !== 'Complete') {
      continue;
    }

    await setTaskSpecStatus(projectRoot, identity.taskSpecId, identity.slug, 'Locked');
    locked.push(identity);
  }

  return locked;
}
