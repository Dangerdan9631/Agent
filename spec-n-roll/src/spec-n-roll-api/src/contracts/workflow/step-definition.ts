import type { StepCompletionCriteria } from '#api/contracts/workflow/step-completion-criteria.js';
import type { StepFailurePolicy } from '#api/contracts/workflow/step-failure-policy.js';
import type { ManifestoReference } from '#api/contracts/workflow/manifesto-definition.js';

/**
 * Defines one agent-agnostic unit of workflow behavior and its data boundaries.
 */
export interface StepDefinition {
  /**
   * Stable identifier unique within its workflow definition. The value must be non-empty.
   */
  readonly id: string;

  /**
   * Stable neutral skill definition identifier resolved by an agent extension. The value must be non-empty.
   */
  readonly skillId: string;

  /**
   * JSON Schema object describing values accepted when the step begins.
   */
  readonly inputSchema: Readonly<Record<string, unknown>>;

  /**
   * JSON Schema object describing values produced when the step completes.
   */
  readonly outputSchema: Readonly<Record<string, unknown>>;

  /**
   * Observable conditions that gate successful completion when the schema alone is insufficient.
   */
  readonly completionCriteria?: StepCompletionCriteria;

  /**
   * Behavior applied when step execution or a required hook fails.
   */
  readonly failurePolicy: StepFailurePolicy;

  /**
   * Ordered step-specific manifestos loaded after workflow-global guidance.
   */
  readonly manifestos?: readonly ManifestoReference[];
}
