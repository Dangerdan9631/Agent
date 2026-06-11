import path from 'node:path';
import fse from 'fs-extra';

import { projectMetadataSchema, type ProjectMetadata } from '../config/schema.js';
import { formatTaskSpecId } from '../workflow/state.js';
import { atomicWriteJson } from './atomic-write.js';

/**
 * Schema version written for new project metadata files.
 */
export const PROJECT_METADATA_SCHEMA_VERSION = '1';

/**
 * Relative path to the project metadata file from the project root.
 */
export const PROJECT_METADATA_RELATIVE_PATH = '.spec-n-roll/config/project-metadata.json';

/**
 * Returns the absolute path to the project metadata file.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Absolute path to `project-metadata.json`.
 */
export function projectMetadataPath(projectRoot: string): string {
  return path.join(projectRoot, PROJECT_METADATA_RELATIVE_PATH);
}

/**
 * Reads project metadata when the metadata file exists.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed metadata or null when the file is absent.
 */
export async function readProjectMetadata(projectRoot: string): Promise<ProjectMetadata | null> {
  const filePath = projectMetadataPath(projectRoot);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const raw: unknown = await fse.readJson(filePath);
  return projectMetadataSchema.parse(raw);
}

/**
 * Partial project metadata fields accepted on write; `updatedAt` is set automatically.
 */
export type ProjectMetadataWriteInput = Partial<
  Omit<ProjectMetadata, 'updatedAt' | 'schemaVersion' | 'nextTaskSpecId'>
> & {
  schemaVersion?: string;
  nextTaskSpecId?: number;
  updatedAt?: string;
};

/**
 * Writes project metadata atomically with schema validation and a fresh `updatedAt`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Metadata fields to merge into the next persisted document.
 * @returns The validated metadata including `updatedAt`.
 */
export async function writeProjectMetadata(
  projectRoot: string,
  input: ProjectMetadataWriteInput,
): Promise<ProjectMetadata> {
  const existing = await readProjectMetadata(projectRoot);
  const payload: ProjectMetadata = projectMetadataSchema.parse({
    schemaVersion:
      input.schemaVersion ?? existing?.schemaVersion ?? PROJECT_METADATA_SCHEMA_VERSION,
    nextTaskSpecId: input.nextTaskSpecId ?? existing?.nextTaskSpecId ?? 1,
    currentTaskSpecId:
      input.currentTaskSpecId !== undefined
        ? input.currentTaskSpecId
        : (existing?.currentTaskSpecId ?? null),
    currentTaskSlug:
      input.currentTaskSlug !== undefined
        ? input.currentTaskSlug
        : (existing?.currentTaskSlug ?? null),
    implementationStartedAt:
      input.implementationStartedAt !== undefined
        ? input.implementationStartedAt
        : (existing?.implementationStartedAt ?? null),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });

  await atomicWriteJson(projectMetadataPath(projectRoot), payload);
  return payload;
}

/**
 * Allocates the next task spec id and increments the metadata counter atomically.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Allocated task spec id string and updated metadata.
 */
export async function allocateNextTaskSpecId(projectRoot: string): Promise<{
  taskSpecId: string;
  metadata: ProjectMetadata;
}> {
  const existing = await readProjectMetadata(projectRoot);
  const nextId = existing?.nextTaskSpecId ?? 1;
  const taskSpecId = formatTaskSpecId(nextId);

  const metadata = await writeProjectMetadata(projectRoot, {
    nextTaskSpecId: nextId + 1,
  });

  return { taskSpecId, metadata };
}
