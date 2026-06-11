import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteJson } from './atomic-write.js';
import { taskSpecDir } from './paths.js';
import { assertTaskSpecWritable } from './task-lifecycle.js';
import {
  WORKFLOW_STATE_FILENAME,
  WORKFLOW_STATE_SCHEMA_VERSION,
  workflowStateSchema,
  type WorkflowState,
} from '../workflow/state.js';

/**
 * Returns the absolute path to the workflow state file for a task spec directory.
 *
 * @param taskSpecDirectory - Absolute path to the task spec directory.
 * @returns Absolute path to `workflow-state.json`.
 */
export function workflowStatePath(taskSpecDirectory: string): string {
  return path.join(taskSpecDirectory, WORKFLOW_STATE_FILENAME);
}

/**
 * Resolves and returns the workflow state file path for a task spec identity.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Absolute path to `workflow-state.json`.
 */
export function workflowStatePathForTask(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): string {
  return workflowStatePath(taskSpecDir(projectRoot, taskSpecId, slug));
}

/**
 * Reads workflow state for a task spec when the state file exists.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Parsed workflow state or null when the file is absent.
 */
export async function readWorkflowState(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<WorkflowState | null> {
  const filePath = workflowStatePathForTask(projectRoot, taskSpecId, slug);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const raw: unknown = await fse.readJson(filePath);
  return workflowStateSchema.parse(raw);
}

/**
 * Input fields accepted when writing workflow state; `updatedAt` is set automatically.
 */
export type WorkflowStateWriteInput = Omit<WorkflowState, 'updatedAt' | 'schemaVersion'> & {
  schemaVersion?: string;
  updatedAt?: string;
};

/**
 * Writes workflow state atomically with schema validation and a fresh `updatedAt`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Workflow state fields to persist.
 * @returns The validated workflow state including `updatedAt`.
 */
export async function writeWorkflowState(
  projectRoot: string,
  input: WorkflowStateWriteInput,
): Promise<WorkflowState> {
  await assertTaskSpecWritable(projectRoot, input.taskSpecId, input.slug);

  const directory = taskSpecDir(projectRoot, input.taskSpecId, input.slug);
  await fse.ensureDir(directory);

  const payload: WorkflowState = workflowStateSchema.parse({
    schemaVersion: input.schemaVersion ?? WORKFLOW_STATE_SCHEMA_VERSION,
    taskSpecId: input.taskSpecId,
    slug: input.slug,
    workflowVariantId: input.workflowVariantId,
    lastCompletedStepId: input.lastCompletedStepId,
    currentStepId: input.currentStepId ?? null,
    status: input.status,
    interruptedArtifacts: input.interruptedArtifacts,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });

  await atomicWriteJson(workflowStatePath(directory), payload);
  return payload;
}
