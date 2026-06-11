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
 * Formats a numeric task spec ID as a zero-padded string for consistent file naming.
 *
 * @param numericId - Positive integer task spec counter value.
 * @returns Zero-padded string such as `001` or `042`.
 */
export function formatTaskSpecId(numericId: number): string {
  return String(numericId).padStart(3, '0');
}
