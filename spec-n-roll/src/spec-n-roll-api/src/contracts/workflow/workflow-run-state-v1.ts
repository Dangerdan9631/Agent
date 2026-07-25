import type { WorkflowContextValue } from '#api/contracts/workflow/workflow-context-value.js';
import type { WorkflowHookResultV1 } from '#api/contracts/workflow/workflow-hook-result-v1.js';

/**
 * Describes the lifecycle state controlled by the workflow core.
 */
export type WorkflowCompletionStatus =
  | 'pending'
  | 'in-progress'
  | 'blocked'
  | 'failed'
  | 'completed';

/**
 * Identifies the hook boundary represented by a recorded outcome.
 */
export type WorkflowHookPhase = 'pre' | 'post';

/**
 * Records one validated hook result and the boundary where it occurred.
 */
export interface WorkflowHookOutcomeV1 {
  /**
   * Contract discriminator, fixed at `1` for this outcome shape.
   */
  readonly contractVersion: 1;

  /**
   * Hook boundary that produced the result.
   */
  readonly phase: WorkflowHookPhase;

  /**
   * Structured result returned by the hook.
   */
  readonly result: WorkflowHookResultV1;
}

/**
 * Represents the first immutable workflow run snapshot supplied to hooks.
 */
export interface WorkflowRunStateV1 {
  /**
   * Contract discriminator, fixed at `1` for this state shape.
   */
  readonly contractVersion: 1;

  /**
   * Stable identifier of the workflow run.
   */
  readonly runId: string;

  /**
   * Identifier of the step currently controlled by the core.
   */
  readonly currentStepId: string;

  /**
   * One-based number of the current step attempt.
   */
  readonly attemptCount: number;

  /**
   * Completion state controlled exclusively by the workflow core.
   */
  readonly completionStatus: WorkflowCompletionStatus;

  /**
   * Serializable shared context exposed to hooks as an immutable value.
   */
  readonly context: Readonly<Record<string, WorkflowContextValue>>;

  /**
   * Ordered hook outcomes recorded by the workflow core.
   */
  readonly hookOutcomes: readonly WorkflowHookOutcomeV1[];
}

