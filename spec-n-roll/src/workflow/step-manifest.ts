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
 * Defines the default step sequences for each workflow variant
 * to provide standard workflow configurations.
 */
export const DEFAULT_VARIANT_STEPS: Record<string, readonly string[]> = {
  papercut: ['specify', 'implement'],
  quick: ['specify', 'tasks', 'implement'],
  full: ['specify', 'plan', 'tasks', 'implement'],
};

/**
 * Returns the step IDs for a workflow variant from configuration or defaults.
 *
 * @param variantId - The workflow variant ID to get steps for.
 * @param variantSteps - Optional configured steps for the variant.
 * @returns Array of step IDs for the variant.
 */
export function getVariantStepIds(variantId: string, variantSteps?: readonly string[]): string[] {
  if (variantSteps != null && variantSteps.length > 0) {
    return [...variantSteps];
  }
  return [...(DEFAULT_VARIANT_STEPS[variantId] ?? [])];
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
