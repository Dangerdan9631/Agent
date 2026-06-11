import path from 'node:path';
import fse from 'fs-extra';

import {
  claimImplementSlot,
  clearImplementSlot,
} from '../core/project-metadata.js';
import {
  lockCompleteTaskSpecs,
  readTaskSpecStatus,
  setTaskSpecStatus,
} from '../core/task-lifecycle.js';
import { taskSpecDir } from '../core/paths.js';
import { readWorkflowState, writeWorkflowState } from '../core/workflow-state.js';
import { instantiateStepOutput } from '../core/templates.js';
import { runPlan } from '../specs/plan.js';
import { runTasks } from '../specs/tasks.js';
import {
  detectPartialArtifacts,
  inferLastCompletedStepFromArtifacts,
  readWorkflowConfig,
  type PartialArtifact,
} from './artifacts.js';
import {
  executePlatformScript,
  type ExecutePlatformScriptOptions,
  type PlatformScriptDeps,
  type PlatformScriptExecutionResult,
} from './platform-scripts.js';
import { getVariantStepIds } from './step-manifest.js';
import type { WorkflowState } from './state.js';

/**
 * Step ids that are on-demand only and skipped by `/spec-n-roll` advancement.
 */
export const ON_DEMAND_STEP_IDS = new Set(['clarify', 'analyze']);

/**
 * Identifies a task spec directory by numeric id and slug.
 */
export interface TaskSpecIdentity {
  /** Zero-padded numeric task spec id. */
  taskSpecId: string;
  /** Kebab-case slug paired with the task spec id. */
  slug: string;
  /** Display label such as `001-feature-name`. */
  label: string;
}

/**
 * Context inputs for roll intent detection.
 */
export interface RollIntentContext {
  /** Optional feature description from the `/spec-n-roll` invocation. */
  description?: string;
  /** Task specs with lifecycle status Active. */
  activeTaskSpecs: TaskSpecIdentity[];
  /** Task specs with paused or incomplete workflow progress but not Active. */
  resumableTaskSpecs: TaskSpecIdentity[];
  /** Total number of task spec directories discovered. */
  totalTaskSpecCount: number;
}

/**
 * Discriminated union describing how `/spec-n-roll` should route the invocation.
 */
export type RollIntent =
  | { kind: 'specify'; description: string }
  | { kind: 'prompt_description' }
  | { kind: 'new_or_continue'; resumableTaskSpecs: TaskSpecIdentity[] }
  | { kind: 'task_selection'; candidates: TaskSpecIdentity[] }
  | { kind: 'continue'; taskSpecId: string; slug: string };

/**
 * Choices offered when partial artifacts are detected for an incomplete step.
 */
export const PARTIAL_RECOVERY_CHOICES = ['restart', 'cancel', 'force-clean'] as const;

/**
 * Developer choice for recovering from partial step artifacts.
 */
export type PartialRecoveryChoice = (typeof PARTIAL_RECOVERY_CHOICES)[number];

/**
 * Prompt payload for partial artifact recovery.
 */
export interface PartialRecoveryPrompt {
  /** Workflow step id with partial artifacts. */
  stepId: string;
  /** Partial artifacts detected for the step. */
  partialArtifacts: PartialArtifact[];
  /** Available recovery choices. */
  choices: readonly PartialRecoveryChoice[];
}

/**
 * Describes a mismatch between workflow state and on-disk artifacts.
 */
export interface StateArtifactConflict {
  /** Last completed step recorded in workflow state. */
  stateLastCompletedStepId: string | null;
  /** Last completed step inferred from artifacts. */
  artifactLastCompletedStepId: string | null;
  /** Human-readable warning message. */
  message: string;
}

/**
 * Options for running a workflow automation script through the workflow engine.
 */
export interface RunAutomationScriptOptions {
  /** Absolute path to the project root containing `.spec-n-roll/scripts/`. */
  projectRoot: string;
  /** Script base name without platform extension. */
  scriptBaseName: string;
  /** Optional arguments forwarded to the script. */
  args?: string[];
  /** Optional dependency overrides for tests. */
  deps?: PlatformScriptDeps;
}

/**
 * Options controlling `/spec-n-roll` orchestration.
 */
export interface RunRollOptions {
  /** Absolute path to the project root. */
  projectRoot: string;
  /** Optional feature description for new-spec routing. */
  description?: string;
  /** Explicit task spec id when continuing a known spec. */
  taskSpecId?: string;
  /** Explicit slug when continuing a known spec. */
  slug?: string;
  /** Confirms partial artifact recovery when detected. */
  confirmPartialRecovery?: (prompt: PartialRecoveryPrompt) => Promise<PartialRecoveryChoice>;
  /** Confirms proceeding when workflow state conflicts with artifacts. */
  confirmStateArtifactConflict?: (conflict: StateArtifactConflict) => Promise<boolean>;
  /** Choice after a new-or-continue prompt. */
  newOrContinueChoice?: 'new' | 'continue';
  /** Selected index from a numbered task list (1-based). */
  selectedTaskIndex?: number;
}

/**
 * Result of a `/spec-n-roll` orchestration run.
 */
export type RollResult =
  | { action: 'specify'; description: string }
  | { action: 'prompt_description' }
  | { action: 'new_or_continue'; resumableTaskSpecs: TaskSpecIdentity[] }
  | { action: 'task_selection'; candidates: TaskSpecIdentity[] }
  | { action: 'workflow_complete'; taskSpecId: string; slug: string }
  | { action: 'step_completed'; stepId: string; taskSpecId: string; slug: string }
  | { action: 'implement'; taskSpecId: string; slug: string }
  | { action: 'paused'; taskSpecId: string; slug: string };

const TASK_SPEC_DIR_PATTERN = /^(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * Parses a task spec directory name into id and slug components.
 *
 * @param directoryName - Directory basename such as `001-sample-feature`.
 * @returns Parsed identity or null when the name does not match.
 */
export function parseTaskSpecDirectoryName(
  directoryName: string,
): { taskSpecId: string; slug: string } | null {
  const match = TASK_SPEC_DIR_PATTERN.exec(directoryName);
  if (match == null) {
    return null;
  }

  return {
    taskSpecId: match[1]!,
    slug: match[2]!,
  };
}

/**
 * Detects how `/spec-n-roll` should route based on description and task spec inventory.
 *
 * @param context - Roll intent context assembled from the project.
 * @returns Discriminated roll intent for orchestration.
 */
export function detectRollIntent(context: RollIntentContext): RollIntent {
  const description = context.description?.trim();
  if (description != null && description.length > 0) {
    return { kind: 'specify', description };
  }

  if (context.activeTaskSpecs.length > 1) {
    return { kind: 'task_selection', candidates: context.activeTaskSpecs };
  }

  if (context.activeTaskSpecs.length === 1) {
    const only = context.activeTaskSpecs[0]!;
    return { kind: 'continue', taskSpecId: only.taskSpecId, slug: only.slug };
  }

  if (context.resumableTaskSpecs.length > 0) {
    return { kind: 'new_or_continue', resumableTaskSpecs: context.resumableTaskSpecs };
  }

  return { kind: 'prompt_description' };
}

/**
 * Returns the next tier step id after the last completed step for a variant.
 *
 * On-demand steps such as clarify and analyze are excluded from automatic advancement.
 *
 * @param workflowVariantId - Active workflow variant id.
 * @param lastCompletedStepId - Last successfully completed step id, or null.
 * @param variantSteps - Optional configured steps for the variant.
 * @returns Next step id or null when the workflow is complete.
 */
export function resolveNextStepId(
  workflowVariantId: string,
  lastCompletedStepId: string | null,
  variantSteps?: readonly string[],
): string | null {
  const steps = getVariantStepIds(workflowVariantId, variantSteps).filter(
    (stepId) => !ON_DEMAND_STEP_IDS.has(stepId),
  );

  if (steps.length === 0) {
    return null;
  }

  if (lastCompletedStepId == null) {
    return steps[0] ?? null;
  }

  const lastIndex = steps.indexOf(lastCompletedStepId);
  if (lastIndex < 0) {
    return steps[0] ?? null;
  }

  const nextIndex = lastIndex + 1;
  if (nextIndex >= steps.length) {
    return null;
  }

  return steps[nextIndex] ?? null;
}

/**
 * Lists task spec directories under `specs/`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed task spec identities sorted by id.
 */
export async function listTaskSpecIdentities(projectRoot: string): Promise<TaskSpecIdentity[]> {
  const specsDir = path.join(projectRoot, 'specs');
  if (!(await fse.pathExists(specsDir))) {
    return [];
  }

  const entries = await fse.readdir(specsDir, { withFileTypes: true });
  const identities: TaskSpecIdentity[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const parsed = parseTaskSpecDirectoryName(entry.name);
    if (parsed == null) {
      continue;
    }

    identities.push({
      taskSpecId: parsed.taskSpecId,
      slug: parsed.slug,
      label: `${parsed.taskSpecId}-${parsed.slug}`,
    });
  }

  return identities.sort((left, right) => left.taskSpecId.localeCompare(right.taskSpecId));
}

/**
 * Returns Active lifecycle task specs for numbered-list selection.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Active task spec identities.
 */
export async function listActiveTaskSpecs(projectRoot: string): Promise<TaskSpecIdentity[]> {
  const identities = await listTaskSpecIdentities(projectRoot);
  const active: TaskSpecIdentity[] = [];

  for (const identity of identities) {
    const status = await readTaskSpecStatus(projectRoot, identity.taskSpecId, identity.slug);
    if (status === 'Active') {
      active.push(identity);
    }
  }

  return active;
}

/**
 * Returns task specs with paused or incomplete workflow progress that are not Active.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Resumable task spec identities for new-or-continue prompts.
 */
export async function listResumableTaskSpecs(projectRoot: string): Promise<TaskSpecIdentity[]> {
  const identities = await listTaskSpecIdentities(projectRoot);
  const resumable: TaskSpecIdentity[] = [];

  for (const identity of identities) {
    const status = await readTaskSpecStatus(projectRoot, identity.taskSpecId, identity.slug);
    if (status === 'Active') {
      continue;
    }

    const state = await readWorkflowState(projectRoot, identity.taskSpecId, identity.slug);
    if (state == null) {
      continue;
    }

    const nextStep = resolveNextStepId(state.workflowVariantId, state.lastCompletedStepId);
    if (state.status === 'paused' || nextStep != null) {
      resumable.push(identity);
    }
  }

  return resumable;
}

/**
 * Builds roll intent context by scanning the project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param description - Optional description argument from the command.
 * @returns Context for `detectRollIntent`.
 */
export async function buildRollIntentContext(
  projectRoot: string,
  description?: string,
): Promise<RollIntentContext> {
  const identities = await listTaskSpecIdentities(projectRoot);
  const activeTaskSpecs = await listActiveTaskSpecs(projectRoot);
  const resumableTaskSpecs = await listResumableTaskSpecs(projectRoot);

  return {
    description,
    activeTaskSpecs,
    resumableTaskSpecs,
    totalTaskSpecCount: identities.length,
  };
}

/**
 * Detects whether parseable workflow state conflicts with artifact-inferred progress.
 *
 * @param state - Parsed workflow state.
 * @param artifactLastCompletedStepId - Last completed step inferred from artifacts.
 * @returns Conflict details or null when aligned.
 */
export function detectStateArtifactConflict(
  state: WorkflowState,
  artifactLastCompletedStepId: string | null,
): StateArtifactConflict | null {
  const stateLast = state.lastCompletedStepId;
  if (stateLast === artifactLastCompletedStepId) {
    return null;
  }

  return {
    stateLastCompletedStepId: stateLast,
    artifactLastCompletedStepId,
    message:
      `Workflow state records last completed step "${stateLast ?? 'none'}", ` +
      `but artifacts suggest "${artifactLastCompletedStepId ?? 'none'}". State will be used after confirmation.`,
  };
}

/**
 * Returns partial artifacts for the next incomplete step when present.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param nextStepId - Step id about to execute.
 * @param state - Current workflow state or null.
 * @returns Partial artifacts for the step, if any.
 */
export async function getPartialArtifactsForStep(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  nextStepId: string,
  state: WorkflowState | null,
): Promise<PartialArtifact[]> {
  const taskDirectory = taskSpecDir(projectRoot, taskSpecId, slug);
  const detection = await detectPartialArtifacts(projectRoot, taskDirectory, state);
  return detection.partialArtifacts.filter((artifact) => artifact.stepId === nextStepId);
}

/**
 * Applies the developer's partial recovery choice for a step.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param stepId - Workflow step being recovered.
 * @param choice - Selected recovery action.
 * @param partialArtifacts - Partial artifacts for the step.
 * @param state - Current workflow state used for paused transitions.
 */
export async function applyPartialRecovery(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  stepId: string,
  choice: PartialRecoveryChoice,
  partialArtifacts: PartialArtifact[],
  state: WorkflowState,
): Promise<void> {
  if (choice === 'cancel') {
    await writeWorkflowState(projectRoot, {
      taskSpecId,
      slug,
      workflowVariantId: state.workflowVariantId,
      lastCompletedStepId: state.lastCompletedStepId,
      currentStepId: stepId,
      status: 'paused',
      interruptedArtifacts: partialArtifacts.map((artifact) => artifact.relativePath),
    });
    return;
  }

  if (choice === 'force-clean') {
    for (const artifact of partialArtifacts) {
      if (artifact.relativePath.endsWith('/')) {
        await fse.remove(artifact.absolutePath);
      } else {
        await fse.remove(artifact.absolutePath);
      }
    }
  }

  if (choice === 'restart' || choice === 'force-clean') {
    if (stepId === 'specify' || stepId === 'plan' || stepId === 'tasks') {
      await instantiateStepOutput(projectRoot, taskSpecId, slug, stepId);
    }
  }
}

/**
 * Marks a task spec workflow finished with lifecycle Complete and operational state complete.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param state - Current workflow state when present.
 */
async function completeTaskSpecWorkflow(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  state: WorkflowState | null,
): Promise<void> {
  await setTaskSpecStatus(projectRoot, taskSpecId, slug, 'Complete');

  if (state != null) {
    await writeWorkflowState(projectRoot, {
      taskSpecId,
      slug,
      workflowVariantId: state.workflowVariantId,
      lastCompletedStepId: state.lastCompletedStepId,
      currentStepId: null,
      status: 'complete',
    });
  }

  await clearImplementSlot(projectRoot);
}

/**
 * Locks eligible Complete specs before a non-specify tier step begins.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param stepId - Workflow step about to execute.
 */
async function lockCompleteSpecsBeforeStep(projectRoot: string, stepId: string): Promise<void> {
  if (stepId === 'specify') {
    return;
  }

  await lockCompleteTaskSpecs(projectRoot);
}

/**
 * Executes a built-in tier step handler and returns the completed step id.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param stepId - Tier step id to execute.
 * @returns Completed step id.
 */
async function executeTierStep(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  stepId: string,
): Promise<string> {
  switch (stepId) {
    case 'plan':
      await runPlan({ projectRoot, taskSpecId, slug });
      return 'plan';
    case 'tasks':
      await runTasks({ projectRoot, taskSpecId, slug });
      return 'tasks';
    case 'implement':
      return 'implement';
    default:
      throw new Error(`Unsupported automatic tier step: ${stepId}`);
  }
}

/**
 * Resolves workflow progress using state when parseable, otherwise artifact fallback.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param workflowConfig - Optional workflow configuration override.
 * @returns Variant id, last completed step, state record, and optional conflict.
 */
async function resolveWorkflowProgress(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<{
  variantId: string;
  lastCompletedStepId: string | null;
  state: WorkflowState | null;
  conflict: StateArtifactConflict | null;
  variantSteps: string[];
}> {
  const workflowConfig = await readWorkflowConfig(projectRoot);
  const taskDirectory = taskSpecDir(projectRoot, taskSpecId, slug);
  const state = await readWorkflowState(projectRoot, taskSpecId, slug);
  const variantId = state?.workflowVariantId ?? workflowConfig?.defaultWorkflowId ?? 'quick';
  const configuredSteps = workflowConfig?.workflows.find((workflow) => workflow.id === variantId)
    ?.steps;
  const variantSteps = getVariantStepIds(variantId, configuredSteps);

  const artifactLastCompleted = await inferLastCompletedStepFromArtifacts(
    projectRoot,
    taskDirectory,
    variantId,
    configuredSteps,
  );

  if (state == null) {
    return {
      variantId,
      lastCompletedStepId: artifactLastCompleted,
      state: null,
      conflict: null,
      variantSteps,
    };
  }

  const conflict = detectStateArtifactConflict(state, artifactLastCompleted);
  return {
    variantId,
    lastCompletedStepId: state.lastCompletedStepId,
    state,
    conflict,
    variantSteps,
  };
}

/**
 * Runs `/spec-n-roll` advancement for a project or routes to specify intent handlers.
 *
 * @param options - Roll orchestration options and interactive callbacks.
 * @returns Roll result describing routing or completed step work.
 */
export async function runRoll(options: RunRollOptions): Promise<RollResult> {
  const projectRoot = path.resolve(options.projectRoot);

  if (options.taskSpecId == null || options.slug == null) {
    const context = await buildRollIntentContext(projectRoot, options.description);
    const intent = detectRollIntent(context);

    switch (intent.kind) {
      case 'specify':
        return { action: 'specify', description: intent.description };
      case 'prompt_description':
        return { action: 'prompt_description' };
      case 'new_or_continue':
        if (options.newOrContinueChoice === 'new') {
          return { action: 'prompt_description' };
        }
        if (options.newOrContinueChoice === 'continue' && intent.resumableTaskSpecs[0] != null) {
          const selected = intent.resumableTaskSpecs[0];
          return runRoll({
            ...options,
            taskSpecId: selected.taskSpecId,
            slug: selected.slug,
            description: undefined,
          });
        }
        return { action: 'new_or_continue', resumableTaskSpecs: intent.resumableTaskSpecs };
      case 'task_selection': {
        const index = options.selectedTaskIndex;
        if (index == null) {
          return { action: 'task_selection', candidates: intent.candidates };
        }
        const selected = intent.candidates[index - 1];
        if (selected == null) {
          throw new Error(`Invalid task selection index: ${index}`);
        }
        return runRoll({
          ...options,
          taskSpecId: selected.taskSpecId,
          slug: selected.slug,
          description: undefined,
        });
      }
      case 'continue':
        return runRoll({
          ...options,
          taskSpecId: intent.taskSpecId,
          slug: intent.slug,
          description: undefined,
        });
      default:
        return { action: 'prompt_description' };
    }
  }

  const { taskSpecId, slug } = options;
  const progress = await resolveWorkflowProgress(projectRoot, taskSpecId, slug);

  if (progress.conflict != null) {
    const confirmed = (await options.confirmStateArtifactConflict?.(progress.conflict)) ?? false;
    if (!confirmed) {
      throw new Error('Workflow advancement cancelled due to state/artifact conflict.');
    }
  }

  const nextStepId = resolveNextStepId(
    progress.variantId,
    progress.lastCompletedStepId,
    progress.variantSteps,
  );

  if (nextStepId == null) {
    await completeTaskSpecWorkflow(projectRoot, taskSpecId, slug, progress.state);
    return { action: 'workflow_complete', taskSpecId, slug };
  }

  const partialArtifacts = await getPartialArtifactsForStep(
    projectRoot,
    taskSpecId,
    slug,
    nextStepId,
    progress.state,
  );

  if (partialArtifacts.length > 0) {
    const prompt: PartialRecoveryPrompt = {
      stepId: nextStepId,
      partialArtifacts,
      choices: PARTIAL_RECOVERY_CHOICES,
    };
    const choice =
      (await options.confirmPartialRecovery?.(prompt)) ??
      (() => {
        throw new Error('Partial artifacts detected. Provide confirmPartialRecovery callback.');
      })();

    const stateForRecovery =
      progress.state ??
      ({
        taskSpecId,
        slug,
        workflowVariantId: progress.variantId,
        lastCompletedStepId: progress.lastCompletedStepId,
        currentStepId: nextStepId,
        status: 'active',
        schemaVersion: '1',
        updatedAt: new Date().toISOString(),
      } satisfies WorkflowState);

    await applyPartialRecovery(
      projectRoot,
      taskSpecId,
      slug,
      nextStepId,
      choice,
      partialArtifacts,
      stateForRecovery,
    );

    if (choice === 'cancel') {
      return { action: 'paused', taskSpecId, slug };
    }
  }

  if (progress.state == null) {
    await writeWorkflowState(projectRoot, {
      taskSpecId,
      slug,
      workflowVariantId: progress.variantId,
      lastCompletedStepId: progress.lastCompletedStepId,
      currentStepId: null,
      status: 'active',
    });
  }

  if (nextStepId === 'implement') {
    await lockCompleteSpecsBeforeStep(projectRoot, 'implement');
    await claimImplementSlot(projectRoot, taskSpecId, slug);

    const existingState = progress.state ?? (await readWorkflowState(projectRoot, taskSpecId, slug));
    if (existingState != null) {
      await writeWorkflowState(projectRoot, {
        taskSpecId,
        slug,
        workflowVariantId: existingState.workflowVariantId,
        lastCompletedStepId: existingState.lastCompletedStepId,
        currentStepId: 'implement',
        status: 'active',
      });
    }
    return { action: 'implement', taskSpecId, slug };
  }

  await lockCompleteSpecsBeforeStep(projectRoot, nextStepId);
  const completedStepId = await executeTierStep(projectRoot, taskSpecId, slug, nextStepId);
  return { action: 'step_completed', stepId: completedStepId, taskSpecId, slug };
}

/**
 * Runs a toolkit automation script using platform-appropriate selection.
 *
 * The workflow engine never spawns the wrong platform script variant; runtime
 * detection chooses `.ps1` on Windows and `.sh` on Unix-like systems.
 *
 * @param options - Project root, script id, optional args, and test overrides.
 * @returns Captured stdout/stderr and exit code from the script process.
 */
export async function runAutomationScript(
  options: RunAutomationScriptOptions,
): Promise<PlatformScriptExecutionResult> {
  const executeOptions: ExecutePlatformScriptOptions = {
    projectRoot: options.projectRoot,
    scriptBaseName: options.scriptBaseName,
    args: options.args,
    deps: options.deps,
  };

  return executePlatformScript(executeOptions);
}
