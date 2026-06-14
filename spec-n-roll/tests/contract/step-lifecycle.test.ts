import os from 'node:os';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/cli/commands/init.js';
import { CoreMutationError } from '../../src/core/errors.js';
import { runStepFinalize, runStepInit } from '../../src/core/step-lifecycle.js';
import {
  WorkflowStateFinalizeGateError,
  readWorkflowState,
  writeWorkflowState,
} from '../../src/core/workflow-state.js';
import { writeGlobalManifesto } from '../../src/manifesto/index.js';
import {
  detectManifestoConstitutionConflicts,
  validateManifestoDraft,
} from '../../src/manifesto/validation.js';
import { createDefaultSetListsFile } from '../../src/setlists/index.js';
import { atomicWriteJson } from '../../src/core/atomic-write.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/workflow/artifacts.js';

const tempRoots: string[] = [];

beforeAll(() => {
  if (!fse.pathExistsSync(path.resolve('dist/cli/index.js'))) {
    throw new Error('Build output missing. Run `npm run build` before contract tests.');
  }
});

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

/**
 * Creates a temporary project with workflow config and set lists for lifecycle tests.
 *
 * @param suffix - Unique suffix for the temp directory name.
 * @returns Absolute path to the project root.
 */
async function createLifecycleProject(suffix: string): Promise<string> {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-lifecycle-${suffix}-${Date.now()}`);
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

  return projectRoot;
}

/**
 * Seeds baseline workflow state for lifecycle contract scenarios.
 *
 * @param projectRoot - Absolute path to the project root.
 */
async function seedWorkflowState(projectRoot: string): Promise<void> {
  await writeWorkflowState(projectRoot, {
    taskSpecId: '007',
    slug: 'step-manifesto-setlists',
    workflowVariantId: 'quick',
    lastCompletedStepId: 'specify',
    currentStepId: null,
    status: 'active',
  });
}

describe('step lifecycle contract — init', () => {
  it('step init happy path returns manifestos, before hooks, and lifecycle metadata', async () => {
    const projectRoot = await createLifecycleProject('init-happy');
    await seedWorkflowState(projectRoot);
    await writeGlobalManifesto(projectRoot, '## Global\nAlways initialize steps first.');

    const planManifestoPath = path.join(
      projectRoot,
      '.spec-n-roll/config/manifesto/steps/plan.md',
    );
    await fse.ensureDir(path.dirname(planManifestoPath));
    await fse.writeFile(planManifestoPath, '## Plan\nPlan-specific guidance.', 'utf8');

    await fse.ensureDir(path.join(projectRoot, '.specify'));
    await fse.writeFile(
      path.join(projectRoot, '.specify/extensions.yml'),
      `hooks:
  before_plan:
    - extension: git-commit
      command: speckit.git.commit
      enabled: true
      optional: false
      description: Commit spec artifacts before planning
`,
      'utf8',
    );

    const result = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(result.blocking).toBe(false);
    expect(result.taskSpecId).toBe('007');
    expect(result.slug).toBe('step-manifesto-setlists');
    expect(result.stepId).toBe('plan');
    expect(result.setListId).toBe('quick');
    expect(result.manifestos?.map((entry) => entry.scope)).toEqual(['global', 'step']);
    expect(result.beforeHooks?.length).toBeGreaterThan(0);
    expect(result.beforeHooks?.[0]).toMatchObject({
      phase: 'before',
      source: 'specify-extensions-yml',
    });
    expect(result.workflowState?.lifecycle?.status).toBe('in-progress');
    expect(result.workflowState?.lifecycle?.activeStepId).toBe('plan');
    expect(result.workflowState?.lifecycle?.initAt).toMatch(/^\d{4}-/);
  });

  it('step init blocks when active step cannot be resolved', async () => {
    const projectRoot = await createLifecycleProject('init-block');

    const result = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(result.blocking).toBe(true);
    expect(result.message).toContain('007');
    expect(result.workflowState).toBeUndefined();
  });
});

describe('step lifecycle contract — finalize', () => {
  it('step finalize rejects completion without prior init for the same step', async () => {
    const projectRoot = await createLifecycleProject('finalize-no-init');
    await seedWorkflowState(projectRoot);

    await expect(
      runStepFinalize(projectRoot, {
        taskSpecId: '007',
        slug: 'step-manifesto-setlists',
        stepId: 'plan',
        validationPassed: true,
      }),
    ).rejects.toBeInstanceOf(CoreMutationError);
  });

  it('step finalize rejects completion when validationPassed is false', async () => {
    const projectRoot = await createLifecycleProject('finalize-validation');
    await seedWorkflowState(projectRoot);

    await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    const result = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
      validationPassed: false,
    });

    expect(result.validationStatus).toBe('failed');
    expect(result.completionEligible).toBe(false);
    expect(result.workflowState.lastCompletedStepId).toBe('specify');

    const persisted = await readWorkflowState(projectRoot, '007', 'step-manifesto-setlists');
    expect(persisted?.lastCompletedStepId).toBe('specify');
  });

  it('step finalize updates lastCompletedStepId after successful validation', async () => {
    const projectRoot = await createLifecycleProject('finalize-success');
    await seedWorkflowState(projectRoot);

    await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    const result = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
      validationPassed: true,
    });

    expect(result.validationStatus).toBe('passed');
    expect(result.completionEligible).toBe(true);
    expect(result.alreadyFinalized).not.toBe(true);
    expect(result.workflowState.lastCompletedStepId).toBe('plan');
    expect(result.workflowState.lifecycle?.status).toBe('completed');
    expect(result.workflowState.lifecycle?.finalizedAt).toMatch(/^\d{4}-/);
  });

  it('second step finalize is idempotent with alreadyFinalized true', async () => {
    const projectRoot = await createLifecycleProject('finalize-idempotent');
    await seedWorkflowState(projectRoot);

    await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    const first = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
      validationPassed: true,
    });

    const second = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
      validationPassed: true,
    });

    expect(first.alreadyFinalized).not.toBe(true);
    expect(second.alreadyFinalized).toBe(true);
    expect(second.workflowState).toEqual(first.workflowState);
  });
});

describe('step lifecycle contract — hooks', () => {
  /**
   * Writes hook configuration for lifecycle hook contract scenarios.
   *
   * @param projectRoot - Absolute path to the project root.
   * @param yamlBody - YAML body for `.specify/extensions.yml`.
   */
  async function writeExtensionsYaml(projectRoot: string, yamlBody: string): Promise<void> {
    await fse.ensureDir(path.join(projectRoot, '.specify'));
    await fse.writeFile(path.join(projectRoot, '.specify/extensions.yml'), yamlBody, 'utf8');
  }

  /**
   * Installs a minimal skill directory so hook command availability checks pass.
   *
   * @param projectRoot - Absolute path to the project root.
   * @param command - Normalized slash command token.
   */
  async function installSkillStub(projectRoot: string, command: string): Promise<void> {
    const skillDir = path.join(projectRoot, '.agents', 'skills', command);
    await fse.ensureDir(skillDir);
    await fse.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: ${command}\ndescription: Test skill stub\n---\n`,
      'utf8',
    );
  }

  it('returns before hooks only in init and after hooks only in finalize', async () => {
    const projectRoot = await createLifecycleProject('hooks-phase');
    await seedWorkflowState(projectRoot);
    await installSkillStub(projectRoot, 'speckit-agent-context-update');
    await writeExtensionsYaml(
      projectRoot,
      `hooks:
  before_plan:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: true
      optional: true
      description: Refresh context before planning
  after_plan:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: true
      optional: true
      description: Refresh context after planning
`,
    );

    const initResult = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(initResult.blocking).toBe(false);
    expect(initResult.beforeHooks).toHaveLength(1);
    expect(initResult.beforeHooks?.[0]?.phase).toBe('before');
    expect(initResult).not.toHaveProperty('afterHooks');

    const finalizeResult = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
      validationPassed: true,
    });

    expect(finalizeResult.afterHooks).toHaveLength(1);
    expect(finalizeResult.afterHooks[0]?.phase).toBe('after');
    expect(finalizeResult).not.toHaveProperty('beforeHooks');
  });

  it('omits disabled hooks from init and finalize responses', async () => {
    const projectRoot = await createLifecycleProject('hooks-disabled');
    await seedWorkflowState(projectRoot);
    await installSkillStub(projectRoot, 'speckit-agent-context-update');
    await writeExtensionsYaml(
      projectRoot,
      `hooks:
  before_plan:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: false
      optional: true
      description: Disabled before hook
  after_plan:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: false
      optional: true
      description: Disabled after hook
`,
    );

    const initResult = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(initResult.beforeHooks).toEqual([]);

    const finalizeResult = await runStepFinalize(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
      validationPassed: true,
    });

    expect(finalizeResult.afterHooks).toEqual([]);
  });

  it('labels mandatory hooks when optional is false', async () => {
    const projectRoot = await createLifecycleProject('hooks-mandatory');
    await seedWorkflowState(projectRoot);
    await installSkillStub(projectRoot, 'speckit-git-commit');
    await writeExtensionsYaml(
      projectRoot,
      `hooks:
  before_plan:
    - extension: git-commit
      command: speckit.git.commit
      enabled: true
      optional: false
      description: Commit spec artifacts before planning
`,
    );

    const initResult = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(initResult.beforeHooks?.[0]).toMatchObject({
      optional: false,
      mandatory: true,
      available: true,
    });
  });

  it('reports unavailable hook commands as non-blocking diagnostics', async () => {
    const projectRoot = await createLifecycleProject('hooks-unavailable');
    await seedWorkflowState(projectRoot);
    await writeExtensionsYaml(
      projectRoot,
      `hooks:
  before_plan:
    - extension: git-commit
      command: speckit.git.commit
      enabled: true
      optional: false
      description: Commit spec artifacts before planning
`,
    );

    const initResult = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(initResult.blocking).toBe(false);
    expect(initResult.beforeHooks?.[0]).toMatchObject({
      command: 'speckit-git-commit',
      available: false,
      mandatory: true,
    });
    expect(initResult.diagnostics?.some((entry) => entry.includes('not available'))).toBe(true);
  });

  it('surfaces invalid extensions.yml as non-blocking diagnostics without blocking init', async () => {
    const projectRoot = await createLifecycleProject('hooks-invalid-yaml');
    await seedWorkflowState(projectRoot);
    await writeExtensionsYaml(projectRoot, 'hooks:\n  before_plan: [invalid yaml');

    const initResult = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(initResult.blocking).toBe(false);
    expect(initResult.beforeHooks).toEqual([]);
    expect(initResult.diagnostics?.some((entry) => entry.includes('extensions.yml'))).toBe(true);
  });
});

describe('step lifecycle contract — manifesto scope', () => {
  it('step init reports diagnostic when global manifesto is missing or empty', async () => {
    const projectRoot = await createLifecycleProject('manifesto-empty-global');
    await seedWorkflowState(projectRoot);

    const result = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(result.blocking).toBe(false);
    expect(result.manifestos ?? []).toHaveLength(0);
    expect(result.diagnostics).toContain('no global manifesto defined');
  });

  it('orphan step manifesto files remain on disk but are not loaded for other steps', async () => {
    const projectRoot = await createLifecycleProject('manifesto-orphan');
    await seedWorkflowState(projectRoot);
    await writeGlobalManifesto(projectRoot, '## Global\nProject-wide rule.');

    const planManifestoPath = path.join(
      projectRoot,
      '.spec-n-roll/config/manifesto/steps/plan.md',
    );
    const orphanManifestoPath = path.join(
      projectRoot,
      '.spec-n-roll/config/manifesto/steps/orphan-step.md',
    );
    await fse.ensureDir(path.dirname(planManifestoPath));
    await fse.writeFile(planManifestoPath, '## Plan\nPlan-specific rule.', 'utf8');
    await fse.writeFile(orphanManifestoPath, '## Orphan\nUnused step rule.', 'utf8');

    const tasksResult = await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'tasks',
    });

    expect(tasksResult.manifestos?.map((entry) => entry.scope)).toEqual(['global']);
    expect(tasksResult.manifestos?.some((entry) => entry.stepId === 'plan')).toBe(false);
    expect(tasksResult.manifestos?.some((entry) => entry.stepId === 'orphan-step')).toBe(false);
    expect(await fse.pathExists(orphanManifestoPath)).toBe(true);
  });

  it('manifesto draft validation surfaces constitution conflicts before save', async () => {
    const constitution = 'Contributors MUST have doc comments on all top-level functions.';
    const draft = '## Rules\nOmit doc comments on helper utilities to move faster.';

    const conflicts = detectManifestoConstitutionConflicts(draft, constitution);
    expect(conflicts.length).toBeGreaterThan(0);

    const validation = validateManifestoDraft(draft, 'global', { constitutionContent: constitution });
    expect(validation.valid).toBe(false);
    expect(validation.conflicts?.length).toBeGreaterThan(0);
  });
});

describe('step lifecycle contract — completion gate', () => {
  it('workflow state write rejects lastCompletedStepId without successful finalize', async () => {
    const projectRoot = await createLifecycleProject('gate');
    await seedWorkflowState(projectRoot);

    await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    await expect(
      writeWorkflowState(projectRoot, {
        taskSpecId: '007',
        slug: 'step-manifesto-setlists',
        workflowVariantId: 'quick',
        lastCompletedStepId: 'plan',
        status: 'active',
        lifecycle: {
          activeStepId: 'plan',
          status: 'in-progress',
          initAt: new Date().toISOString(),
        },
      }),
    ).rejects.toBeInstanceOf(WorkflowStateFinalizeGateError);
  });
});
