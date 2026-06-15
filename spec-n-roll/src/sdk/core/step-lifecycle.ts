import path from 'node:path';
import fse from 'fs-extra';

import { CoreMutationError } from './errors.js';
import {
  collectHookInstructions,
  type StepHookInstruction,
} from '../extensions/hooks.js';

export type { StepHookInstruction } from '../extensions/hooks.js';
import { readManifestosForStep } from '../manifesto/index.js';
import { readSetListsFile } from '../setlists/index.js';
import { taskSpecDir } from './paths.js';
import { readWorkflowState, writeWorkflowState } from './workflow-state.js';
import { isRegisteredWorkflowStep, resolveRegisteredWorkflowStepIds } from '../workflow/step-manifest.js';
import type { WorkflowState } from '../workflow/state.js';

/**
 * One manifesto entry included in a step init response.
 */
export interface StepInitManifestoEntry {
  /**
   * Whether the entry is project-global or scoped to the active step.
   */
  scope: 'global' | 'step';
  /**
   * Workflow step id when `scope` is `step`.
   */
  stepId?: string;
  /**
   * Project-relative path to the manifesto file.
   */
  path: string;
  /**
   * Raw markdown body loaded from disk.
   */
  content: string;
}

/**
 * Input accepted by `runStepInit`.
 */
export interface StepInitInput {
  /**
   * Zero-padded numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Workflow step id to initialize for this attempt.
   */
  stepId: string;
}

/**
 * Successful or blocking response from `runStepInit`.
 */
export interface StepInitResult {
  /**
   * Task spec id echoed from the input when initialization proceeds or blocks.
   */
  taskSpecId?: string;
  /**
   * Task spec slug echoed from the input when initialization proceeds or blocks.
   */
  slug?: string;
  /**
   * Workflow step id echoed from the input when initialization proceeds or blocks.
   */
  stepId?: string;
  /**
   * Selected set list id for the current spec context, when available.
   */
  setListId?: string;
  /**
   * Current workflow state snapshot after lifecycle metadata updates.
   */
  workflowState?: WorkflowState;
  /**
   * Scope-labeled manifesto entries loaded for the step.
   */
  manifestos?: StepInitManifestoEntry[];
  /**
   * Enabled before-phase hook instructions for the agent to call.
   */
  beforeHooks?: StepHookInstruction[];
  /**
   * Non-blocking warnings such as invalid hook configuration.
   */
  diagnostics?: string[];
  /**
   * When true, the step cannot proceed and other fields may be omitted.
   */
  blocking: boolean;
  /**
   * Human-readable explanation when `blocking` is true.
   */
  message?: string;
}

/**
 * Input accepted by `runStepFinalize`.
 */
export interface StepFinalizeInput {
  /**
   * Zero-padded numeric task spec id.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Workflow step id being finalized.
   */
  stepId: string;
  /**
   * Whether the agent attests that step output validation succeeded.
   */
  validationPassed: boolean;
}

/**
 * Response from `runStepFinalize`.
 */
export interface StepFinalizeResult {
  /**
   * Task spec id echoed from the input.
   */
  taskSpecId: string;
  /**
   * Task spec slug echoed from the input.
   */
  slug: string;
  /**
   * Workflow step id echoed from the input.
   */
  stepId: string;
  /**
   * Outcome of the agent-reported validation gate.
   */
  validationStatus: 'passed' | 'failed';
  /**
   * Enabled after-phase hook instructions for the agent to call.
   */
  afterHooks: StepHookInstruction[];
  /**
   * Non-blocking warnings such as invalid hook configuration.
   */
  diagnostics?: string[];
  /**
   * Whether the step may be marked complete after mandatory hooks run.
   */
  completionEligible: boolean;
  /**
   * Updated workflow state including lifecycle and completion metadata.
   */
  workflowState: WorkflowState;
  /**
   * True when finalize is invoked again for an already completed step attempt.
   */
  alreadyFinalized?: boolean;
}

/**
 * Resolves the enabled set list id matching a workflow variant id.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param workflowVariantId - Workflow variant id from workflow state.
 * @returns Matching set list id or the workflow variant id when no entry matches.
 */
async function resolveSetListId(
  projectRoot: string,
  workflowVariantId: string,
): Promise<string> {
  const setListsFile = await readSetListsFile(projectRoot);
  const match = setListsFile?.setLists.find(
    (entry) => entry.enabled && entry.workflowId === workflowVariantId,
  );
  return match?.id ?? workflowVariantId;
}

/**
 * Verifies that the task spec directory exists on disk.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns True when the task spec directory exists.
 */
async function taskSpecExists(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<boolean> {
  return fse.pathExists(taskSpecDir(projectRoot, taskSpecId, slug));
}

/**
 * Initializes a workflow step attempt with manifestos and before-hook instructions.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Task spec identity and step id to initialize.
 * @returns Step init payload or a blocking error result.
 */
export async function runStepInit(
  projectRoot: string,
  input: StepInitInput,
): Promise<StepInitResult> {
  const resolvedRoot = path.resolve(projectRoot);
  const { taskSpecId, slug, stepId } = input;

  if (!(await taskSpecExists(resolvedRoot, taskSpecId, slug))) {
    return {
      blocking: true,
      message: `Cannot initialize step: task spec directory ${taskSpecId}-${slug} not found`,
      diagnostics: [],
    };
  }

  const workflowState = await readWorkflowState(resolvedRoot, taskSpecId, slug);
  if (workflowState == null) {
    return {
      blocking: true,
      message: `Cannot initialize step: no active workflow state for task spec ${taskSpecId}`,
      diagnostics: [],
    };
  }

  const registeredStepIds = await resolveRegisteredWorkflowStepIds(resolvedRoot);
  if (!isRegisteredWorkflowStep(stepId, registeredStepIds)) {
    return {
      blocking: true,
      message: `Cannot initialize step: unknown workflow step id "${stepId}"`,
      diagnostics: [],
    };
  }

  const manifestoEntries = await readManifestosForStep(resolvedRoot, stepId);
  const hookCollection = await collectHookInstructions({
    projectRoot: resolvedRoot,
    stepId,
    phase: 'before',
  });
  const diagnostics = [...hookCollection.diagnostics];

  if (!manifestoEntries.some((entry) => entry.scope === 'global')) {
    diagnostics.push('no global manifesto defined');
  }

  const initAt = new Date().toISOString();
  const updatedState = await writeWorkflowState(resolvedRoot, {
    taskSpecId,
    slug,
    workflowVariantId: workflowState.workflowVariantId,
    lastCompletedStepId: workflowState.lastCompletedStepId,
    currentStepId: stepId,
    status: workflowState.status === 'complete' ? 'active' : workflowState.status,
    interruptedArtifacts: workflowState.interruptedArtifacts,
    lifecycle: {
      activeStepId: stepId,
      status: 'in-progress',
      initAt,
    },
  });

  const setListId = await resolveSetListId(resolvedRoot, workflowState.workflowVariantId);

  return {
    taskSpecId,
    slug,
    stepId,
    setListId,
    workflowState: updatedState,
    manifestos: manifestoEntries,
    beforeHooks: hookCollection.instructions,
    diagnostics,
    blocking: false,
  };
}

/**
 * Finalizes a workflow step attempt after validation and returns after-hook instructions.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Task spec identity, step id, and validation attestation.
 * @returns Step finalize payload with completion eligibility and updated state.
 */
export async function runStepFinalize(
  projectRoot: string,
  input: StepFinalizeInput,
): Promise<StepFinalizeResult> {
  const resolvedRoot = path.resolve(projectRoot);
  const { taskSpecId, slug, stepId, validationPassed } = input;

  const existingState = await readWorkflowState(resolvedRoot, taskSpecId, slug);
  if (existingState == null) {
    throw new CoreMutationError(
      'LIFECYCLE_INIT_REQUIRED',
      `step finalize requires workflow state for task spec ${taskSpecId}-${slug}`,
      'Run step init before finalize.',
    );
  }

  const lifecycle = existingState.lifecycle;
  if (
    lifecycle == null ||
    lifecycle.initAt == null ||
    lifecycle.activeStepId !== stepId
  ) {
    throw new CoreMutationError(
      'LIFECYCLE_INIT_REQUIRED',
      `step finalize requires step init for step '${stepId}'`,
      'Call step init for the same step id before finalize.',
    );
  }

  const hookCollection = await collectHookInstructions({
    projectRoot: resolvedRoot,
    stepId,
    phase: 'after',
  });

  if (!validationPassed) {
    return {
      taskSpecId,
      slug,
      stepId,
      validationStatus: 'failed',
      afterHooks: hookCollection.instructions,
      diagnostics: hookCollection.diagnostics,
      completionEligible: false,
      workflowState: existingState,
    };
  }

  const alreadyCompleted =
    lifecycle.status === 'completed' &&
    lifecycle.finalizedAt != null &&
    existingState.lastCompletedStepId === stepId;

  if (alreadyCompleted) {
    return {
      taskSpecId,
      slug,
      stepId,
      validationStatus: 'passed',
      afterHooks: hookCollection.instructions,
      diagnostics: hookCollection.diagnostics,
      completionEligible: true,
      workflowState: existingState,
      alreadyFinalized: true,
    };
  }

  const now = new Date().toISOString();
  const updatedState = await writeWorkflowState(resolvedRoot, {
    taskSpecId,
    slug,
    workflowVariantId: existingState.workflowVariantId,
    lastCompletedStepId: stepId,
    currentStepId: null,
    status: existingState.status === 'complete' ? 'complete' : 'active',
    interruptedArtifacts: existingState.interruptedArtifacts,
    lifecycle: {
      activeStepId: stepId,
      status: 'completed',
      initAt: lifecycle.initAt,
      validatedAt: now,
      finalizedAt: now,
    },
  });

  return {
    taskSpecId,
    slug,
    stepId,
    validationStatus: 'passed',
    afterHooks: hookCollection.instructions,
    diagnostics: hookCollection.diagnostics,
    completionEligible: true,
    workflowState: updatedState,
    alreadyFinalized: false,
  };
}
