import path from 'node:path';
import fse from 'fs-extra';

import { taskSpecFilePath } from '../core/paths.js';
import { instantiateStepOutput } from '../core/templates.js';
import { readWorkflowState } from '../core/workflow-state.js';

/**
 * Options controlling the /spec-n-tasks step orchestration flow.
 */
export interface RunTasksOptions {
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
 * Summary returned after a successful tasks step run.
 */
export interface TasksResult {
  /**
   * Task spec id that received tasks.md.
   */
  taskSpecId: string;
  /**
   * Slug of the task spec directory.
   */
  slug: string;
  /**
   * True when living-spec updates appear before test/code phases per FR-009.
   */
  livingSpecFirst: boolean;
}

/**
 * Validates that tasks.md lists living-spec updates before test or code tasks.
 *
 * @param tasksContent - Full tasks.md markdown content.
 * @returns True when FR-009 ordering is satisfied in the template.
 */
export function tasksTemplateSatisfiesFr009(tasksContent: string): boolean {
  const livingIndex = tasksContent.indexOf('Living Specification Updates');
  const testsPhaseIndex = tasksContent.indexOf('## Phase 2: Tests');
  return (
    livingIndex >= 0 &&
    testsPhaseIndex > livingIndex &&
    /before any test or production code/i.test(tasksContent)
  );
}

/**
 * Runs the tasks step by instantiating tasks.md and updating workflow state.
 *
 * @param options - Tasks orchestration options.
 * @returns Summary of the instantiated tasks artifact.
 */
export async function runTasks(options: RunTasksOptions): Promise<TasksResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const { taskSpecId, slug } = options;

  const existingState = await readWorkflowState(projectRoot, taskSpecId, slug);
  if (existingState == null) {
    throw new Error(`Workflow state is missing for task spec ${taskSpecId}-${slug}.`);
  }

  await instantiateStepOutput(projectRoot, taskSpecId, slug, 'tasks');

  const tasksPath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'tasks.md');
  const tasksContent = await fse.readFile(tasksPath, 'utf8');
  const livingSpecFirst = tasksTemplateSatisfiesFr009(tasksContent);

  if (!livingSpecFirst) {
    throw new Error(
      'tasks.md template violates FR-009: living-spec updates must be the first implementation phase.',
    );
  }

  return {
    taskSpecId,
    slug,
    livingSpecFirst,
  };
}
