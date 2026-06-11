import path from 'node:path';
import fse from 'fs-extra';
import { z } from 'zod';
import { kebabCaseIdSchema, taskSpecIdSchema } from '../config/schema.js';

/**
 * Schema version for workflow state to enable future migrations.
 */
export const WORKFLOW_STATE_SCHEMA_VERSION = '1';

/**
 * Filename for the workflow state file within a task spec directory.
 */
export const WORKFLOW_STATE_FILENAME = 'workflow-state.json';

/**
 * Zod schema for workflow state tracking task spec execution progress.
 */
export const workflowStateSchema = z
  .object({
    /**
     * Version of this state document's shape so readers can migrate older persisted data.
     */
    schemaVersion: z.string().min(1),
    /**
     * Owning task spec's zero-padded numeric id (taskSpecIdSchema).
     */
    taskSpecId: taskSpecIdSchema,
    /**
     * Required kebab-case slug matching the task spec directory name suffix.
     */
    slug: kebabCaseIdSchema,
    /**
     * Kebab-case id of the active workflow tier variant for this run.
     */
    workflowVariantId: kebabCaseIdSchema,
    /**
     * Kebab-case id of the last successfully finished step, or null when none have completed.
     */
    lastCompletedStepId: kebabCaseIdSchema.nullable(),
    /**
     * Kebab-case id of the step in progress when interrupted, or null/omitted when unknown or idle.
     */
    currentStepId: kebabCaseIdSchema.nullable().optional(),
    /**
     * Operational progress discriminator (`active`, `paused`, or `complete`); distinct from task spec lifecycle status.
     */
    status: z.enum(['active', 'paused', 'complete']),
    /**
     * Optional list of project-relative paths to partial artifacts detected for the current incomplete step.
     */
    interruptedArtifacts: z.array(z.string()).optional(),
    /**
     * ISO-8601 datetime marking when this state was last written.
     */
    updatedAt: z.string().datetime(),
  })
  .strict();

/**
 * Workflow state type tracking task spec execution progress.
 */
export type WorkflowState = z.infer<typeof workflowStateSchema>;

/**
 * Zod schema for project metadata tracking task spec IDs and active task.
 */
export const projectMetadataSchema = z
  .object({
    /**
     * Version of this metadata document's shape so readers can migrate older persisted data.
     */
    schemaVersion: z.string().min(1),
    /**
     * Positive integer counter for the next auto-assigned task spec numeric id; incremented when a new task spec is created.
     */
    nextTaskSpecId: z.number().int().min(1),
    /**
     * Optional taskSpecIdSchema of the task spec currently in implementation, or null when none.
     */
    currentTaskSpecId: taskSpecIdSchema.nullable().optional(),
    /**
     * Optional kebab-case slug paired with currentTaskSpecId; required and non-empty when currentTaskSpecId is set.
     */
    currentTaskSlug: kebabCaseIdSchema.nullable().optional(),
    /**
     * Optional ISO-8601 datetime when implementation began for the current task, or null.
     */
    implementationStartedAt: z.string().datetime().nullable().optional(),
    /**
     * ISO-8601 datetime marking when this metadata was last written.
     */
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.currentTaskSpecId != null && value.currentTaskSlug == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentTaskSlug is required when currentTaskSpecId is set',
        path: ['currentTaskSlug'],
      });
    }
    if (
      value.currentTaskSpecId != null &&
      value.currentTaskSlug != null &&
      value.currentTaskSlug.length < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentTaskSlug must be non-empty when currentTaskSpecId is set',
        path: ['currentTaskSlug'],
      });
    }
  });

/**
 * Project metadata type tracking task spec IDs and active task.
 */
export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

/**
 * Returns the absolute path to the workflow state file for a task spec.
 *
 * @param taskSpecDir - Directory containing the task spec. Must be a valid directory.
 * @returns Absolute path to the workflow state file.
 */
export function workflowStatePath(taskSpecDir: string): string {
  return path.join(taskSpecDir, WORKFLOW_STATE_FILENAME);
}

/**
 * Reads the workflow state file to retrieve task spec execution progress.
 *
 * @param taskSpecDir - Directory containing the task spec. Must be a valid directory.
 * @returns Workflow state object or null if the file does not exist.
 */
export async function readWorkflowState(taskSpecDir: string): Promise<WorkflowState | null> {
  const filePath = workflowStatePath(taskSpecDir);
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const raw: unknown = await fse.readJson(filePath);
  return workflowStateSchema.parse(raw);
}

/**
 * Writes the workflow state file to update task spec execution progress.
 *
 * @param taskSpecDir - Directory containing the task spec. Must be a valid directory.
 * @param state - The state to write, optionally without updatedAt.
 * @returns The complete WorkflowState object with updatedAt set.
 */
export async function writeWorkflowState(
  taskSpecDir: string,
  state: Omit<WorkflowState, 'updatedAt'> & { updatedAt?: string },
): Promise<WorkflowState> {
  const filePath = workflowStatePath(taskSpecDir);
  const payload: WorkflowState = workflowStateSchema.parse({
    ...state,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  });

  await atomicWriteJson(filePath, payload);
  return payload;
}

/**
 * Writes JSON data atomically to prevent corruption if the process is
 * interrupted during the write operation.
 *
 * @param filePath - Absolute path to the file to write. Must be a valid path.
 * @param data - The data to write as JSON.
 */
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await fse.ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fse.writeJson(tempPath, data, { spaces: 2 });
  await fse.move(tempPath, filePath, { overwrite: true });
}

/**
 * Formats a numeric task spec ID as a zero-padded string for consistent
 * file naming and display.
 *
 * @param numericId - The numeric ID to format. Must be a positive integer.
 * @returns The zero-padded string representation (e.g., "001", "042").
 */
export function formatTaskSpecId(numericId: number): string {
  return String(numericId).padStart(3, '0');
}
