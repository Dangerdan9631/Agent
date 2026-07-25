import type { WorkflowDefinition } from 'spec-n-roll-api';

/**
 * Identifies one invalid location and the contract rule it violates.
 */
export interface WorkflowDefinitionValidationIssue {
  /**
   * Dot-delimited path to the invalid definition value.
   */
  readonly path: string;

  /**
   * Human-readable explanation of the violated contract rule.
   */
  readonly message: string;
}

/**
 * Reports whether a workflow definition is safe to pass to transition and hook processing.
 */
export type WorkflowDefinitionValidationResult =
  | {
      /**
       * Indicates that every definition invariant passed validation.
       */
      readonly status: 'accepted';

      /**
       * Original immutable definition accepted for downstream processing.
       */
      readonly definition: WorkflowDefinition;
    }
  | {
      /**
       * Indicates that at least one definition invariant failed validation.
       */
      readonly status: 'rejected';

      /**
       * Complete set of independently detectable contract violations.
       */
      readonly issues: readonly WorkflowDefinitionValidationIssue[];
    };
