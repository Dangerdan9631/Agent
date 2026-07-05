import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import fse from 'fs-extra';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/sdk/init.js';
import { runStepFinalize, runStepInit } from '../../src/sdk/core/step-lifecycle.js';
import {
  WorkflowStateFinalizeGateError,
  readWorkflowState,
  writeWorkflowState,
} from '../../src/sdk/core/workflow-state.js';
import { createDefaultSetListsFile } from '../../src/sdk/setlists/index.js';
import { writeGlobalManifesto } from '../../src/sdk/manifesto/index.js';
import { atomicWriteJson } from '../../src/sdk/core/atomic-write.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/sdk/workflow/artifacts.js';

const tempRoots: string[] = [];
const cliPath = path.resolve('dist/cli/index.js');

beforeAll(() => {
  if (!fse.pathExistsSync(cliPath)) {
    throw new Error('Build output missing. Run `npm run build` before integration tests.');
  }
});

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

/**
 * Creates a temporary project for step lifecycle integration scenarios.
 *
 * @param suffix - Unique suffix for the temp directory name.
 * @returns Absolute path to the project root.
 */
async function createLifecycleProject(suffix: string): Promise<string> {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-lifecycle-int-${suffix}-${Date.now()}`);
  tempRoots.push(projectRoot);
  await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config'));
  await fse.ensureDir(path.join(projectRoot, 'specs', '007-step-manifesto-setlists'));

  const workflowConfig = createDefaultWorkflowConfig({
    toolkitVersion: '0.1.2',
    selectedAgentIds: ['cursor'],
  });
  await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), workflowConfig);
  await atomicWriteJson(
    path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
    createDefaultSetListsFile(),
  );

  await writeWorkflowState(projectRoot, {
    taskSpecId: '007',
    slug: 'step-manifesto-setlists',
    workflowVariantId: 'quick',
    lastCompletedStepId: 'specify',
    currentStepId: null,
    status: 'active',
  });

  return projectRoot;
}

/**
 * Runs a CLI subcommand and returns parsed JSON stdout.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the script path.
 * @returns Parsed JSON object from stdout.
 */
function runCliJson(projectRoot: string, args: string[]): unknown {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as unknown;
}

describe('step lifecycle integration', () => {
  it('requires step init before work and step finalize before completion', async () => {
    const projectRoot = await createLifecycleProject('ordering');

    const initFromCli = runCliJson(projectRoot, [
      'step',
      'init',
      '--task-spec-id',
      '007',
      '--slug',
      'step-manifesto-setlists',
      '--step-id',
      'tasks',
    ]) as { blocking: boolean; workflowState?: { lifecycle?: { initAt?: string } } };

    expect(initFromCli.blocking).toBe(false);
    expect(initFromCli.workflowState?.lifecycle?.initAt).toMatch(/^\d{4}-/);

    const finalizeFromCli = runCliJson(projectRoot, [
      'step',
      'finalize',
      '--task-spec-id',
      '007',
      '--slug',
      'step-manifesto-setlists',
      '--step-id',
      'tasks',
      '--validation-passed',
      'true',
    ]) as { completionEligible: boolean; workflowState: { lastCompletedStepId: string | null } };

    expect(finalizeFromCli.completionEligible).toBe(true);
    expect(finalizeFromCli.workflowState.lastCompletedStepId).toBe('tasks');

    const persisted = await readWorkflowState(projectRoot, '007', 'step-manifesto-setlists');
    expect(persisted?.lifecycle?.status).toBe('completed');
  }, 30_000);

  it('rejects workflow completion without successful step finalize', async () => {
    const projectRoot = await createLifecycleProject('reject-direct');

    await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'tasks',
    });

    await expect(
      writeWorkflowState(projectRoot, {
        taskSpecId: '007',
        slug: 'step-manifesto-setlists',
        workflowVariantId: 'quick',
        lastCompletedStepId: 'tasks',
        status: 'active',
        lifecycle: {
          activeStepId: 'tasks',
          status: 'in-progress',
          initAt: new Date().toISOString(),
        },
      }),
    ).rejects.toBeInstanceOf(WorkflowStateFinalizeGateError);

    const finalized = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'tasks',
      validationPassed: true,
    });

    expect(finalized.workflowState.lastCompletedStepId).toBe('tasks');
  }, 30_000);

  it('loads global manifesto on every step init and step manifesto only on exact match', async () => {
    const projectRoot = await createLifecycleProject('manifesto-scope');
    await writeGlobalManifesto(projectRoot, '## Global\nAlways follow lifecycle boundaries.');

    const planManifestoPath = path.join(projectRoot, '.spec-n-roll/config/manifesto/steps/plan.md');
    await fse.ensureDir(path.dirname(planManifestoPath));
    await fse.writeFile(planManifestoPath, '## Plan\nPlanning-specific guidance.', 'utf8');

    const planInit = runCliJson(projectRoot, [
      'step',
      'init',
      '--task-spec-id',
      '007',
      '--slug',
      'step-manifesto-setlists',
      '--step-id',
      'plan',
    ]) as { manifestos?: Array<{ scope: string; stepId?: string }> };

    expect(planInit.manifestos?.map((entry) => entry.scope)).toEqual(['global', 'step']);
    expect(planInit.manifestos?.find((entry) => entry.scope === 'step')?.stepId).toBe('plan');

    const tasksInit = runCliJson(projectRoot, [
      'step',
      'init',
      '--task-spec-id',
      '007',
      '--slug',
      'step-manifesto-setlists',
      '--step-id',
      'tasks',
    ]) as { manifestos?: Array<{ scope: string; stepId?: string }> };

    expect(tasksInit.manifestos?.map((entry) => entry.scope)).toEqual(['global']);
    expect(tasksInit.manifestos?.some((entry) => entry.stepId === 'plan')).toBe(false);
  }, 30_000);
});
