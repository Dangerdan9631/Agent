import type { WorkflowContextValue } from '#api/contracts/workflow/workflow-context-value.js';
import type { WorkflowHookStatus } from '#api/contracts/workflow/workflow-hook-status.js';

/**
 * Describes a structured diagnostic observation produced by a workflow hook.
 */
export interface WorkflowHookAnnotation {
  /**
   * Stable category understood by the hook and its consumers.
   */
  readonly type: string;

  /**
   * Human-readable annotation content.
   */
  readonly message: string;

  /**
   * Optional structured details that remain serializable across transports.
   */
  readonly data?: Readonly<Record<string, WorkflowContextValue>>;
}

/**
 * Describes an artifact produced or referenced by a workflow hook.
 */
export interface WorkflowHookArtifact {
  /**
   * Stable artifact identifier within the workflow run.
   */
  readonly id: string;

  /**
   * Artifact category used by consumers to select an appropriate renderer.
   */
  readonly type: string;

  /**
   * Optional location or inline structured representation of the artifact.
   */
  readonly data?: WorkflowContextValue;
}

/**
 * Carries proposed top-level workflow context changes for core validation.
 */
export type WorkflowContextPatchV1 = Readonly<
  Record<string, WorkflowContextValue>
>;

/**
 * Represents the first version of the structured result returned by a workflow hook.
 */
export interface WorkflowHookResultV1 {
  /**
   * Contract discriminator, fixed at `1` for this result shape.
   */
  readonly contractVersion: 1;

  /**
   * Control decision the workflow core must interpret.
   */
  readonly status: WorkflowHookStatus;

  /**
   * Optional top-level context changes applied only after core validation.
   */
  readonly contextPatch?: WorkflowContextPatchV1;

  /**
   * Structured observations recorded with the hook outcome.
   */
  readonly annotations?: readonly WorkflowHookAnnotation[];

  /**
   * Structured artifacts recorded with the hook outcome.
   */
  readonly artifacts?: readonly WorkflowHookArtifact[];
}

