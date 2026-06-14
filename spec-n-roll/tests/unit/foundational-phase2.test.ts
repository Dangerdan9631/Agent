import os from 'node:os';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/cli/commands/init.js';
import { validateManifestoContent } from '../../src/manifesto/validation.js';
import {
  readGlobalManifesto,
  readManifestosForStep,
  writeGlobalManifesto,
} from '../../src/manifesto/index.js';
import {
  createDefaultSetListsFile,
  createSetList,
  disableSetList,
  readSetListsFile,
  validateSetListsFile,
} from '../../src/setlists/index.js';
import { collectHookInstructions } from '../../src/extensions/hooks.js';
import {
  WorkflowStateFinalizeGateError,
  readWorkflowState,
  writeWorkflowState,
} from '../../src/core/workflow-state.js';
import { migrateSetListsIfMissing } from '../../src/updates/migration.js';
import { atomicWriteJson } from '../../src/core/atomic-write.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/workflow/artifacts.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

/**
 * Creates a temporary initialized project root for foundational module tests.
 *
 * @returns Absolute path to the temporary project root.
 */
async function createProjectRoot(): Promise<string> {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-phase2-${Date.now()}`);
  tempRoots.push(projectRoot);
  await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config'));

  const workflowConfig = createDefaultWorkflowConfig({
    toolkitVersion: '0.1.2',
    selectedAgentIds: ['cursor'],
  });
  await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), workflowConfig);
  await atomicWriteJson(
    path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
    createDefaultSetListsFile(),
  );

  return projectRoot;
}

describe('phase 2 foundational modules', () => {
  it('seeds and validates default set lists', async () => {
    const projectRoot = await createProjectRoot();
    const file = await readSetListsFile(projectRoot);

    expect(file?.setLists).toHaveLength(3);
    expect(await validateSetListsFile(projectRoot)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects disabling the last enabled set list', async () => {
    const projectRoot = await createProjectRoot();
    await disableSetList(projectRoot, 'quick');
    await disableSetList(projectRoot, 'full');

    await expect(disableSetList(projectRoot, 'papercut')).rejects.toThrow(
      'Cannot disable the last enabled set list.',
    );
  });

  it('creates a custom set list entry', async () => {
    const projectRoot = await createProjectRoot();
    const updated = await createSetList(projectRoot, {
      id: 'custom-flow',
      name: 'Custom Flow',
      description: 'Custom workflow for experiments',
      workflowId: 'quick',
      priority: 10,
      enabled: true,
    });

    expect(updated.setLists.some((entry) => entry.id === 'custom-flow')).toBe(true);
  });

  it('validates manifesto content and writes global manifesto atomically', async () => {
    const projectRoot = await createProjectRoot();
    const invalid = validateManifestoContent('', 'global');
    expect(invalid.valid).toBe(false);

    const placeholder = validateManifestoContent('## Rules\n[MANIFESTO_TITLE]', 'global');
    expect(placeholder.valid).toBe(false);

    await writeGlobalManifesto(projectRoot, '## Rules\nAlways run step init first.');
    expect(await readGlobalManifesto(projectRoot)).toContain('step init');
  });

  it('loads global manifesto for any step and step manifesto only on match', async () => {
    const projectRoot = await createProjectRoot();
    await writeGlobalManifesto(projectRoot, '## Global\nProject-wide rule.');

    const planManifestoPath = path.join(
      projectRoot,
      '.spec-n-roll/config/manifesto/steps/plan.md',
    );
    await fse.ensureDir(path.dirname(planManifestoPath));
    await fse.writeFile(planManifestoPath, '## Plan\nPlan-specific rule.');

    const planEntries = await readManifestosForStep(projectRoot, 'plan');
    expect(planEntries.map((entry) => entry.scope)).toEqual(['global', 'step']);

    const tasksEntries = await readManifestosForStep(projectRoot, 'tasks');
    expect(tasksEntries.map((entry) => entry.scope)).toEqual(['global']);
  });

  it('collects specify extension after hooks for a step', async () => {
    const projectRoot = await createProjectRoot();
    await fse.ensureDir(path.join(projectRoot, '.specify'));
    await fse.writeFile(
      path.join(projectRoot, '.specify/extensions.yml'),
      `hooks:
  after_specify:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: true
      optional: true
      description: Refresh agent context after specification
`,
      'utf8',
    );

    const result = await collectHookInstructions({
      projectRoot,
      stepId: 'specify',
      phase: 'after',
    });

    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]).toMatchObject({
      phase: 'after',
      command: 'speckit-agent-context-update',
      source: 'specify-extensions-yml',
    });
  });

  it('migrates missing set-lists.json from workflow variants', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-phase2-migrate-${Date.now()}`);
    tempRoots.push(projectRoot);
    await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config'));

    const workflowConfig = createDefaultWorkflowConfig({
      toolkitVersion: '0.1.2',
      selectedAgentIds: ['cursor'],
    });
    await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), workflowConfig);

    const migrated = await migrateSetListsIfMissing(projectRoot);
    expect(migrated?.file.setLists).toHaveLength(3);
    expect(migrated?.diagnostic).toContain('set list');

    const reread = await readSetListsFile(projectRoot);
    expect(reread?.setLists.map((entry) => entry.id)).toEqual(['papercut', 'quick', 'full']);
  });

  it('blocks lastCompletedStepId updates when lifecycle finalize is missing', async () => {
    const projectRoot = await createProjectRoot();

    await writeWorkflowState(projectRoot, {
      taskSpecId: '001',
      slug: 'sample-feature',
      workflowVariantId: 'quick',
      lastCompletedStepId: null,
      status: 'active',
      lifecycle: {
        activeStepId: 'specify',
        status: 'in-progress',
        initAt: new Date().toISOString(),
      },
    });

    await expect(
      writeWorkflowState(projectRoot, {
        taskSpecId: '001',
        slug: 'sample-feature',
        workflowVariantId: 'quick',
        lastCompletedStepId: 'specify',
        status: 'active',
        lifecycle: {
          activeStepId: 'specify',
          status: 'in-progress',
          initAt: new Date().toISOString(),
        },
      }),
    ).rejects.toBeInstanceOf(WorkflowStateFinalizeGateError);

    await writeWorkflowState(projectRoot, {
      taskSpecId: '001',
      slug: 'sample-feature',
      workflowVariantId: 'quick',
      lastCompletedStepId: 'specify',
      status: 'active',
      lifecycle: {
        activeStepId: 'specify',
        status: 'completed',
        initAt: new Date().toISOString(),
        finalizedAt: new Date().toISOString(),
      },
    });

    const state = await readWorkflowState(projectRoot, '001', 'sample-feature');
    expect(state?.lastCompletedStepId).toBe('specify');
  });
});
