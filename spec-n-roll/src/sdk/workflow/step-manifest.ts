import { loadExtensionRegistry } from '../extensions/hooks.js';
import { readWorkflowConfig } from './artifacts.js';

/**
 * Defines the standard output files for each built-in workflow step
 * to enable artifact detection and validation.
 */
export const BUILT_IN_STEP_OUTPUTS: Record<string, readonly string[]> = {
  specify: ['spec.md'],
  plan: ['plan.md'],
  tasks: ['tasks.md'],
};

/**
 * Returns the step IDs for a workflow variant from configuration.
 *
 * @param _variantId - The workflow variant ID to get steps for.
 * @param variantSteps - Configured steps for the variant from workflow.config.json.
 * @returns Array of step IDs for the variant, or empty when not configured.
 */
export function getVariantStepIds(_variantId: string, variantSteps?: readonly string[]): string[] {
  if (variantSteps != null && variantSteps.length > 0) {
    return [...variantSteps];
  }
  return [];
}

/**
 * Returns the output paths for the implement step to support dynamic
 * output resolution based on variant configuration.
 *
 * @param _variantId - Optional variant ID for future variant-specific outputs.
 * @returns Array of output paths for the implement step.
 */
export function getImplementOutputs(_variantId?: string): string[] {
  return ['living-specs/'];
}

/**
 * Returns the output paths for a given step to support artifact detection
 * and validation across all workflow steps.
 *
 * @param stepId - The step ID to get outputs for.
 * @param variantId - Optional variant ID for variant-specific outputs.
 * @returns Array of output paths for the step.
 */
export function getStepOutputs(stepId: string, variantId?: string): string[] {
  const builtIn = BUILT_IN_STEP_OUTPUTS[stepId];
  if (builtIn != null) {
    return [...builtIn];
  }

  if (stepId === 'implement') {
    return getImplementOutputs(variantId);
  }

  return [];
}

/**
 * Returns a map of step IDs to their expected output paths for a variant
 * to enable comprehensive artifact detection.
 *
 * @param variantId - The workflow variant ID to get outputs for.
 * @param variantSteps - Optional configured steps for the variant.
 * @returns Map of step IDs to their output path arrays.
 */
export function getExpectedOutputsForVariant(
  variantId: string,
  variantSteps?: readonly string[],
): Map<string, string[]> {
  const steps = getVariantStepIds(variantId, variantSteps);
  const outputs = new Map<string, string[]>();

  for (const stepId of steps) {
    outputs.set(stepId, getStepOutputs(stepId, variantId));
  }

  return outputs;
}

/**
 * Loads registered workflow step ids from workflow config and enabled extensions.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Set of kebab-case step ids available for lifecycle operations.
 */
export async function resolveRegisteredWorkflowStepIds(projectRoot: string): Promise<Set<string>> {
  const config = await readWorkflowConfig(projectRoot);
  const configStepIds = config?.steps.map((step) => step.id) ?? [];
  const registry = await loadExtensionRegistry(projectRoot);
  const merged = new Set<string>([...configStepIds, ...registry.mergedStepIds]);
  return merged;
}

/**
 * Returns whether a step id is registered in workflow configuration or extensions.
 *
 * @param stepId - Workflow step id to validate.
 * @param registeredStepIds - Set returned from `resolveRegisteredWorkflowStepIds`.
 * @returns True when the step id is known to the project workflow registry.
 */
export function isRegisteredWorkflowStep(
  stepId: string,
  registeredStepIds: ReadonlySet<string>,
): boolean {
  return registeredStepIds.has(stepId);
}
