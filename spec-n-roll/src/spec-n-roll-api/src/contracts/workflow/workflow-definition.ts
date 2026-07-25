import type { StepDefinition } from '#api/contracts/workflow/step-definition.js';
import type { StepFailurePolicy } from '#api/contracts/workflow/step-failure-policy.js';

/**
 * Carries descriptive information that does not affect workflow identity or ordering.
 */
export interface WorkflowDefinitionMetadata {
  /**
   * Human-readable workflow name. The value must be non-empty.
   */
  readonly name: string;

  /**
   * Optional human-readable explanation of the workflow's purpose.
   */
  readonly description?: string;
}

/**
 * Provides values inherited by steps when a future contract makes those values optional.
 */
export interface WorkflowDefinitionDefaults {
  /**
   * Default failure behavior available to workflow consumers composing derived step definitions.
   */
  readonly failurePolicy?: StepFailurePolicy;
}

/**
 * Defines a public, versioned, agent-agnostic workflow and its ordered step references.
 */
export interface WorkflowDefinition {
  /**
   * Contract schema version used to interpret this serialized definition.
   */
  readonly schemaVersion: '1';

  /**
   * Stable workflow identifier. The value must be non-empty.
   */
  readonly id: string;

  /**
   * Revision of this workflow definition. The value must be non-empty.
   */
  readonly version: string;

  /**
   * Descriptive workflow information that does not determine identity.
   */
  readonly metadata: WorkflowDefinitionMetadata;

  /**
   * Optional workflow-level defaults retained with the definition.
   */
  readonly defaults?: WorkflowDefinitionDefaults;

  /**
   * Step definitions addressable by entries in the ordered step list.
   */
  readonly stepDefinitions: readonly StepDefinition[];

  /**
   * Ordered step definition identifiers. Every identifier must resolve exactly once.
   */
  readonly steps: readonly string[];
}
