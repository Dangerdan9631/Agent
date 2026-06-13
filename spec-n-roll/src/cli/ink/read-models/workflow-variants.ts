import { readWorkflowConfig } from '../../../workflow/artifacts.js';

/**
 * Read-only summary of one configured workflow variant.
 */
export interface WorkflowVariantSummary {
  /**
   * Kebab-case workflow variant id from `workflow.config.json`.
   */
  variantId: string;
  /**
   * Human-readable variant name, falling back to the id when missing.
   */
  displayName: string;
  /**
   * Ordered workflow step ids composed by this variant.
   */
  stepSequence: string[];
  /**
   * Human-readable labels for known step ids.
   */
  stepLabels: Readonly<Record<string, string>>;
  /**
   * Optional descriptive text from the workflow configuration.
   */
  description?: string;
  /**
   * Whether this variant is the configured default workflow.
   */
  isDefault: boolean;
}

/**
 * Lists configured workflow variant summaries for an initialized project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Workflow variants in configuration order, or an empty array when uninitialized.
 */
export async function listWorkflowVariantSummaries(
  projectRoot: string,
): Promise<WorkflowVariantSummary[]> {
  const config = await readWorkflowConfig(projectRoot);
  if (config == null) {
    return [];
  }

  const stepLabels = Object.fromEntries(
    config.steps.map((step) => [step.id, step.command.replace(/^spec-n-/, '')]),
  );

  return config.workflows.map((workflow) => ({
    variantId: workflow.id,
    displayName: workflow.name || workflow.id,
    stepSequence: workflow.steps,
    stepLabels,
    description: workflow.description,
    isDefault: workflow.id === config.defaultWorkflowId || workflow.default === true,
  }));
}
