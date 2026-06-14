import path from 'node:path';
import fse from 'fs-extra';

import { instantiateStepOutput } from '../core/templates.js';
import { taskSpecFilePath } from '../core/paths.js';
import { readWorkflowState } from '../core/workflow-state.js';

/**
 * Options controlling the /spec-n-plan step orchestration flow.
 */
export interface RunPlanOptions {
  /**
   * Absolute path to the project root.
   */
  projectRoot: string;
  /**
   * Zero-padded numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
}

/**
 * Summary returned after a successful plan step run.
 */
export interface PlanResult {
  /**
   * Task spec id that received plan.md.
   */
  taskSpecId: string;
  /**
   * Slug of the task spec directory.
   */
  slug: string;
  /**
   * True when plan.md includes the Living Spec Targets section.
   */
  hasLivingSpecTargets: boolean;
}

/**
 * Verifies that plan.md includes the required Living Spec Targets section.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns True when the section is present in the instantiated template.
 */
async function planHasLivingSpecTargets(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<boolean> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'plan.md');
  const content = await fse.readFile(filePath, 'utf8');
  return content.includes('## Living Spec Targets') && /living-specs\//i.test(content);
}

/**
 * Runs the plan step by instantiating plan.md and updating workflow state.
 *
 * @param options - Plan orchestration options.
 * @returns Summary of the instantiated plan artifact.
 */
export async function runPlan(options: RunPlanOptions): Promise<PlanResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const { taskSpecId, slug } = options;

  const existingState = await readWorkflowState(projectRoot, taskSpecId, slug);
  if (existingState == null) {
    throw new Error(`Workflow state is missing for task spec ${taskSpecId}-${slug}.`);
  }

  await instantiateStepOutput(projectRoot, taskSpecId, slug, 'plan');
  const hasLivingSpecTargets = await planHasLivingSpecTargets(projectRoot, taskSpecId, slug);

  return {
    taskSpecId,
    slug,
    hasLivingSpecTargets,
  };
}
