import path from 'node:path';

import fse from 'fs-extra';

import { parseFrontmatterDocument } from '../../../core/frontmatter.js';
import { readWorkflowState } from '../../../core/workflow-state.js';
import type { TaskSpecLifecycleStatus } from '../../../core/task-lifecycle.js';

/**
 * Lifecycle status displayed when a task spec has no readable lifecycle status.
 */
export type TaskSpecLifecycleStatusView = TaskSpecLifecycleStatus | 'unknown';

/**
 * Operational workflow status displayed for task spec browse screens.
 */
export type TaskSpecOperationalStatusView = 'active' | 'paused' | 'complete' | 'missing';

/**
 * Artifact presence flags displayed for a task spec.
 */
export interface TaskSpecArtifactPresence {
  /**
   * Whether `spec.md` exists in the task spec directory.
   */
  spec: boolean;
  /**
   * Whether `plan.md` exists in the task spec directory.
   */
  plan: boolean;
  /**
   * Whether `tasks.md` exists in the task spec directory.
   */
  tasks: boolean;
}

/**
 * Read-only summary for a task spec directory.
 */
export interface TaskSpecSummary {
  /**
   * Zero-padded numeric id parsed from the directory name, or null for unrecognized directories.
   */
  taskSpecId: string | null;
  /**
   * Kebab-case slug parsed from the directory name, or null for unrecognized directories.
   */
  slug: string | null;
  /**
   * Full basename of the task spec directory under `specs/`.
   */
  directoryName: string;
  /**
   * Lifecycle status from `spec.md` frontmatter, or `unknown` when absent or invalid.
   */
  lifecycleStatus: TaskSpecLifecycleStatusView;
  /**
   * Operational workflow status from `workflow-state.json`, or `missing` when absent or invalid.
   */
  operationalStatus: TaskSpecOperationalStatusView;
  /**
   * Current in-progress workflow step id from state, or null when absent.
   */
  currentStepId: string | null;
  /**
   * Last completed workflow step id from state, or null when absent.
   */
  lastCompletedStepId: string | null;
  /**
   * Workflow variant id from state, or null when absent.
   */
  workflowVariantId: string | null;
  /**
   * Presence flags for expected task spec artifacts.
   */
  artifacts: TaskSpecArtifactPresence;
  /**
   * Non-fatal read warnings surfaced in list and detail screens.
   */
  warnings: string[];
  /**
   * True when the directory name does not match the supported task spec pattern.
   */
  unrecognized: boolean;
}

/**
 * Recognized and unrecognized task spec summaries for browse screens.
 */
export interface TaskSpecSummaryList {
  /**
   * Task spec directories with valid `{id}-{slug}` names sorted by numeric id.
   */
  recognized: TaskSpecSummary[];
  /**
   * Directories under `specs/` that are not valid task spec identities.
   */
  unrecognized: TaskSpecSummary[];
}

/**
 * Directory name pattern for task spec identities.
 */
const TASK_SPEC_DIRECTORY_PATTERN = /^(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * Lifecycle status values accepted from task spec frontmatter.
 */
const LIFECYCLE_STATUSES = new Set<string>(['Active', 'Complete', 'Locked']);

/**
 * Reads artifact presence from one task spec directory.
 *
 * @param directoryPath - Absolute path to the task spec directory.
 * @returns Presence flags for known task spec artifacts.
 */
async function readArtifactPresence(directoryPath: string): Promise<TaskSpecArtifactPresence> {
  const [spec, plan, tasks] = await Promise.all([
    fse.pathExists(path.join(directoryPath, 'spec.md')),
    fse.pathExists(path.join(directoryPath, 'plan.md')),
    fse.pathExists(path.join(directoryPath, 'tasks.md')),
  ]);

  return { spec, plan, tasks };
}

/**
 * Reads lifecycle status from `spec.md` without throwing for browse-only display.
 *
 * @param specPath - Absolute path to the candidate `spec.md` file.
 * @returns Lifecycle status and any non-fatal warning.
 */
async function readLifecycleStatus(
  specPath: string,
): Promise<{ status: TaskSpecLifecycleStatusView; warning: string | null }> {
  if (!(await fse.pathExists(specPath))) {
    return { status: 'unknown', warning: 'spec.md is missing.' };
  }

  try {
    const content = await fse.readFile(specPath, 'utf8');
    const { frontmatter } = parseFrontmatterDocument(content);
    const status = frontmatter.status;
    if (typeof status === 'string' && LIFECYCLE_STATUSES.has(status)) {
      return { status: status as TaskSpecLifecycleStatus, warning: null };
    }

    return { status: 'unknown', warning: 'spec.md frontmatter has no recognized status.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'unknown', warning: `Unable to read spec.md frontmatter: ${message}` };
  }
}

/**
 * Reads workflow state without throwing for browse-only display.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case task spec slug.
 * @returns Workflow display fields and any non-fatal warning.
 */
async function readOperationalState(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<{
  status: TaskSpecOperationalStatusView;
  currentStepId: string | null;
  lastCompletedStepId: string | null;
  workflowVariantId: string | null;
  warning: string | null;
}> {
  try {
    const state = await readWorkflowState(projectRoot, taskSpecId, slug);
    if (state == null) {
      return {
        status: 'missing',
        currentStepId: null,
        lastCompletedStepId: null,
        workflowVariantId: null,
        warning: 'workflow-state.json is missing.',
      };
    }

    return {
      status: state.status,
      currentStepId: state.currentStepId ?? null,
      lastCompletedStepId: state.lastCompletedStepId,
      workflowVariantId: state.workflowVariantId,
      warning: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'missing',
      currentStepId: null,
      lastCompletedStepId: null,
      workflowVariantId: null,
      warning: `Unable to read workflow-state.json: ${message}`,
    };
  }
}

/**
 * Builds a read-only summary for one child directory under `specs/`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param directoryName - Basename of a child directory under `specs/`.
 * @returns Tolerant task spec summary for browse screens.
 */
export async function assembleTaskSpecSummary(
  projectRoot: string,
  directoryName: string,
): Promise<TaskSpecSummary> {
  const directoryPath = path.join(projectRoot, 'specs', directoryName);
  const artifacts = await readArtifactPresence(directoryPath);
  const warnings: string[] = [];
  const match = TASK_SPEC_DIRECTORY_PATTERN.exec(directoryName);

  if (match == null) {
    warnings.push('Directory name does not match the required task spec pattern.');
    return {
      taskSpecId: null,
      slug: null,
      directoryName,
      lifecycleStatus: 'unknown',
      operationalStatus: 'missing',
      currentStepId: null,
      lastCompletedStepId: null,
      workflowVariantId: null,
      artifacts,
      warnings,
      unrecognized: true,
    };
  }

  const taskSpecId = match[1]!;
  const slug = match[2]!;
  const lifecycle = await readLifecycleStatus(path.join(directoryPath, 'spec.md'));
  const operational = await readOperationalState(projectRoot, taskSpecId, slug);

  if (lifecycle.warning != null) {
    warnings.push(lifecycle.warning);
  }
  if (operational.warning != null) {
    warnings.push(operational.warning);
  }
  if (lifecycle.status === 'Complete' && operational.status !== 'complete') {
    warnings.push('Lifecycle status is Complete but workflow state is not complete.');
  }
  if (operational.status === 'complete' && lifecycle.status === 'Active') {
    warnings.push('Workflow state is complete but lifecycle status is still Active.');
  }

  return {
    taskSpecId,
    slug,
    directoryName,
    lifecycleStatus: lifecycle.status,
    operationalStatus: operational.status,
    currentStepId: operational.currentStepId,
    lastCompletedStepId: operational.lastCompletedStepId,
    workflowVariantId: operational.workflowVariantId,
    artifacts,
    warnings,
    unrecognized: false,
  };
}

/**
 * Lists read-only task spec summaries for all directories under `specs/`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Recognized and unrecognized task spec summaries.
 */
export async function listTaskSpecSummaries(projectRoot: string): Promise<TaskSpecSummaryList> {
  const specsDir = path.join(projectRoot, 'specs');
  if (!(await fse.pathExists(specsDir))) {
    return { recognized: [], unrecognized: [] };
  }

  const directoryNames = (await fse.readdir(specsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const summaries = await Promise.all(
    directoryNames.map((directoryName) => assembleTaskSpecSummary(projectRoot, directoryName)),
  );

  return {
    recognized: summaries
      .filter((summary) => !summary.unrecognized)
      .sort((left, right) => (left.taskSpecId ?? '').localeCompare(right.taskSpecId ?? '')),
    unrecognized: summaries.filter((summary) => summary.unrecognized),
  };
}
