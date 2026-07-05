import path from 'node:path';
import fse from 'fs-extra';
import { z } from 'zod';

import { taskSpecDir } from './paths.js';
import { atomicWriteJson } from './atomic-write.js';

/**
 * Relative filename for per-task provenance metadata inside a task spec directory.
 */
export const TASK_METADATA_FILENAME = 'task-metadata.json';

/**
 * Relative directory under each task spec that stores toolkit-managed task metadata.
 */
export const TASK_METADATA_RELATIVE_DIR = '.spec-n-roll';

/**
 * Zod schema for per-task provenance metadata persisted beside each task spec.
 */
export const taskMetadataSchema = z
  .object({
    /**
     * ISO-8601 timestamp recorded when the task spec directory was first created.
     */
    createdAt: z.string().datetime().optional(),
    /**
     * ISO-8601 timestamp recorded when implementation began for this task spec.
     */
    implementationStartedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * Parsed per-task provenance metadata fields.
 */
export type TaskMetadata = z.infer<typeof taskMetadataSchema>;

/**
 * Partial task metadata fields accepted on write.
 */
export type TaskMetadataWriteInput = Partial<TaskMetadata>;

/**
 * Resolves the absolute path to a task spec metadata file.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Absolute path to `task-metadata.json` for the task spec.
 */
export function taskMetadataPath(projectRoot: string, taskSpecId: string, slug: string): string {
  return path.join(
    taskSpecDir(projectRoot, taskSpecId, slug),
    TASK_METADATA_RELATIVE_DIR,
    TASK_METADATA_FILENAME,
  );
}

/**
 * Reads per-task metadata when the metadata file exists.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Parsed metadata or null when the file is absent.
 */
export async function readTaskMetadata(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<TaskMetadata | null> {
  const filePath = taskMetadataPath(projectRoot, taskSpecId, slug);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const raw: unknown = await fse.readJson(filePath);
  return taskMetadataSchema.parse(raw);
}

/**
 * Writes per-task metadata atomically, merging with any existing document.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param input - Metadata fields to merge into the next persisted document.
 * @returns The validated metadata after merge.
 */
export async function writeTaskMetadata(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  input: TaskMetadataWriteInput,
): Promise<TaskMetadata> {
  const existing = await readTaskMetadata(projectRoot, taskSpecId, slug);
  const payload = taskMetadataSchema.parse({
    ...existing,
    ...input,
  });

  await atomicWriteJson(taskMetadataPath(projectRoot, taskSpecId, slug), payload);
  return payload;
}
