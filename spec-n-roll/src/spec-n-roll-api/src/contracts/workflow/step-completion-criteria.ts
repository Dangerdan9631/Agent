/**
 * Describes the observable conditions that must hold before a step can complete.
 */
export interface StepCompletionCriteria {
  /**
   * Human-readable condition evaluated by the workflow execution boundary. The value must be non-empty.
   */
  readonly description: string;

  /**
   * Output property names that must be present after required post-hooks finish successfully.
   */
  readonly requiredOutputProperties?: readonly string[];
}
