import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runInit } from '../../src/cli/commands/init.js';
import { readWorkflowState } from '../../src/core/workflow-state.js';
import type { InterviewQuestion } from '../../src/specs/interview.js';
import { runSpecify } from '../../src/specs/specify.js';
import type { PartialRecoveryChoice } from '../../src/workflow/engine.js';
import { resolveNextStepId, runRoll } from '../../src/workflow/engine.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for roll integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-roll-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('/spec-n-roll integration', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('advances through remaining tier steps using workflow state', async () => {
    const projectRoot = createTempProject('advance');

    await runInit({ projectRoot, agents: ['cursor'] });
    const specifyResult = await runSpecify({
      projectRoot,
      description: 'Add email notification when an order ships',
      workflowVariantOverride: 'quick',
      answerInterview: async (question: InterviewQuestion) => question.recommendedAnswer,
    });

    const nextAfterSpecify = resolveNextStepId('quick', 'specify');
    expect(nextAfterSpecify).toBe('tasks');

    const tasksRoll = await runRoll({
      projectRoot,
      taskSpecId: specifyResult.taskSpecId,
      slug: specifyResult.slug,
      confirmStateArtifactConflict: async () => true,
    });

    expect(tasksRoll.action).toBe('step_completed');
    if (tasksRoll.action === 'step_completed') {
      expect(tasksRoll.stepId).toBe('tasks');
    }

    const tasksPath = path.join(
      projectRoot,
      'specs',
      `${specifyResult.taskSpecId}-${specifyResult.slug}`,
      'tasks.md',
    );
    expect(existsSync(tasksPath)).toBe(true);
    expect(readFileSync(tasksPath, 'utf8')).toContain('Living Specification Updates');

    const stateAfterTasks = await readWorkflowState(
      projectRoot,
      specifyResult.taskSpecId,
      specifyResult.slug,
    );
    expect(stateAfterTasks!.lastCompletedStepId).toBe('tasks');

    const implementRoll = await runRoll({
      projectRoot,
      taskSpecId: specifyResult.taskSpecId,
      slug: specifyResult.slug,
      confirmStateArtifactConflict: async () => true,
    });

    expect(implementRoll.action).toBe('implement');
  });

  it('falls back to tier-aware artifact detection when workflow state is missing', async () => {
    const projectRoot = createTempProject('artifact-fallback');

    await runInit({ projectRoot, agents: ['cursor'] });
    const specifyResult = await runSpecify({
      projectRoot,
      description: 'Add email notification when an order ships',
      workflowVariantOverride: 'quick',
      answerInterview: async (question: InterviewQuestion) => question.recommendedAnswer,
    });

    const statePath = path.join(
      projectRoot,
      'specs',
      `${specifyResult.taskSpecId}-${specifyResult.slug}`,
      'workflow-state.json',
    );
    rmSync(statePath);

    const roll = await runRoll({
      projectRoot,
      taskSpecId: specifyResult.taskSpecId,
      slug: specifyResult.slug,
      confirmStateArtifactConflict: async () => true,
    });

    expect(roll.action).toBe('step_completed');
    if (roll.action === 'step_completed') {
      expect(roll.stepId).toBe('tasks');
    }
  });

  it('presents partial recovery choices when partial artifacts exist for the next step', async () => {
    const projectRoot = createTempProject('partial');

    await runInit({ projectRoot, agents: ['cursor'] });
    const specifyResult = await runSpecify({
      projectRoot,
      description:
        'Redesign authentication across web, mobile, and API subsystems with multi-actor flows',
      workflowVariantOverride: 'full',
      answerInterview: async (question: InterviewQuestion) => question.recommendedAnswer,
    });

    const planPath = path.join(
      projectRoot,
      'specs',
      `${specifyResult.taskSpecId}-${specifyResult.slug}`,
      'plan.md',
    );
    writeFileSync(planPath, '# Partial plan\n\n<!-- FILL: incomplete -->\n', 'utf8');

    const choices: PartialRecoveryChoice[] = [];
    const roll = await runRoll({
      projectRoot,
      taskSpecId: specifyResult.taskSpecId,
      slug: specifyResult.slug,
      confirmPartialRecovery: async (prompt) => {
        choices.push(...prompt.choices);
        return 'restart';
      },
      confirmStateArtifactConflict: async () => true,
    });

    expect(choices).toEqual(['restart', 'cancel', 'force-clean']);
    expect(roll.action).toBe('step_completed');
    if (roll.action === 'step_completed') {
      expect(roll.stepId).toBe('plan');
    }
    expect(readFileSync(planPath, 'utf8')).not.toContain('<!-- FILL: incomplete');
  });
});
