import path from 'node:path';

import {
  type ScenarioInput,
  updateLivingSpecFile,
} from '../living-specs/gherkin.js';
import { readWorkflowState, writeWorkflowState } from '../core/workflow-state.js';

/**
 * Options controlling the /spec-n-implement step orchestration flow.
 */
export interface RunImplementOptions {
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
  /**
   * Natural-language feature description used for living spec domain routing.
   */
  featureDescription: string;
  /**
   * New scenarios to append to the routed living spec file.
   */
  scenariosToAdd?: ScenarioInput[];
  /**
   * Existing scenarios to replace by name in the routed living spec file.
   */
  scenariosToUpdate?: ScenarioInput[];
  /**
   * Scenario titles to remove from living spec files during this implementation.
   */
  deprecatedScenarioNames?: string[];
}

/**
 * Summary returned after living-spec-first implement entry.
 */
export interface ImplementResult {
  /**
   * Task spec id entering implementation.
   */
  taskSpecId: string;
  /**
   * Slug of the task spec directory.
   */
  slug: string;
  /**
   * True when a living spec file was created or modified.
   */
  livingSpecUpdated: boolean;
  /**
   * Inferred kebab-case living spec domain.
   */
  domain: string;
  /**
   * Project-relative path to the updated living spec feature file.
   */
  featureRelativePath: string;
  /**
   * Absolute path to the updated living spec feature file.
   */
  featureFilePath: string;
}

/**
 * Runs implement entry with living spec updates before any test or production code.
 *
 * Living spec Gherkin files remain agent-managed; this handler performs the
 * toolkit's first implement action by routing, tagging, and writing scenarios.
 *
 * @param options - Implement orchestration options.
 * @returns Summary of the living spec update performed at implement entry.
 */
export async function runImplement(options: RunImplementOptions): Promise<ImplementResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const { taskSpecId, slug, featureDescription } = options;

  const existingState = await readWorkflowState(projectRoot, taskSpecId, slug);
  if (existingState == null) {
    throw new Error(`Workflow state is missing for task spec ${taskSpecId}-${slug}.`);
  }

  const { route, livingSpecUpdated } = await updateLivingSpecFile(
    projectRoot,
    featureDescription,
    taskSpecId,
    {
      scenariosToAdd: options.scenariosToAdd,
      scenariosToUpdate: options.scenariosToUpdate,
      deprecatedScenarioNames: options.deprecatedScenarioNames,
    },
  );

  await writeWorkflowState(projectRoot, {
    taskSpecId,
    slug,
    workflowVariantId: existingState.workflowVariantId,
    lastCompletedStepId: existingState.lastCompletedStepId,
    currentStepId: 'implement',
    status: 'active',
  });

  return {
    taskSpecId,
    slug,
    livingSpecUpdated,
    domain: route.domain,
    featureRelativePath: route.relativePath,
    featureFilePath: route.absolutePath,
  };
}
