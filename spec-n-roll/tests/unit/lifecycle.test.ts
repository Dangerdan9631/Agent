import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/cli/commands/init.js';
import { CoreMutationError } from '../../src/core/errors.js';
import { updateSpecFrontmatter } from '../../src/core/frontmatter.js';
import { writeProjectMetadata } from '../../src/core/project-metadata.js';
import {
  lockCompleteTaskSpecs,
  readTaskSpecStatus,
  resolveTaskSpecSlug,
  setTaskSpecStatus,
} from '../../src/core/task-lifecycle.js';
import { writeWorkflowState } from '../../src/core/workflow-state.js';
import { runClarify } from '../../src/specs/clarify.js';
import type { InterviewQuestion } from '../../src/specs/interview.js';
import { runRoll } from '../../src/workflow/engine.js';
import { assertUserOwnedPathWritable } from '../../src/updates/ownership.js';
import { WORKFLOW_CONFIG_RELATIVE_PATH } from '../../src/workflow/artifacts.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project root tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created project root.
 */
function createProjectRoot(suffix: string): string {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-lifecycle-${suffix}-${Date.now()}`);
  tempDirs.push(projectRoot);
  return projectRoot;
}

/**
 * Writes default workflow.config.json into a temporary project root.
 *
 * @param projectRoot - Absolute path to the project root.
 */
function seedWorkflowConfig(projectRoot: string): void {
  const config = createDefaultWorkflowConfig({
    toolkitVersion: '0.1.2',
    selectedAgentIds: [],
  });
  config.extensions = [];
  const configPath = path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH);
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

/**
 * Writes a minimal task spec directory with lifecycle status and optional workflow state.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param status - Lifecycle status stored in spec.md frontmatter.
 * @param workflowState - Optional workflow state fields to persist.
 */
function seedTaskSpec(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  status: 'Active' | 'Complete' | 'Locked',
  workflowState?: {
    workflowVariantId: string;
    lastCompletedStepId: string | null;
    currentStepId?: string | null;
    status?: 'active' | 'paused' | 'complete';
  },
): void {
  const specDir = path.join(projectRoot, 'specs', `${taskSpecId}-${slug}`);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    path.join(specDir, 'spec.md'),
    `---\nstatus: ${status}\n---\n\n# ${slug}\n`,
    'utf8',
  );

  if (workflowState != null) {
    writeFileSync(
      path.join(specDir, 'workflow-state.json'),
      JSON.stringify({
        schemaVersion: '1',
        taskSpecId,
        slug,
        workflowVariantId: workflowState.workflowVariantId,
        lastCompletedStepId: workflowState.lastCompletedStepId,
        currentStepId: workflowState.currentStepId ?? null,
        status: workflowState.status ?? 'active',
        updatedAt: new Date().toISOString(),
      }),
      'utf8',
    );
  }
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

describe('task lifecycle', () => {
  it('sets Active status in spec.md frontmatter', async () => {
    const projectRoot = createProjectRoot('active');
    const specDir = path.join(projectRoot, 'specs', '001-demo');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, 'spec.md'), '# Demo\n', 'utf8');

    const result = await setTaskSpecStatus(projectRoot, '001', 'demo', 'Active');
    expect(result.status).toBe('Active');

    const content = readFileSync(path.join(specDir, 'spec.md'), 'utf8');
    expect(content).toContain('status: Active');
    expect(await readTaskSpecStatus(projectRoot, '001', 'demo')).toBe('Active');
  });

  it('transitions to Complete when implement workflow finishes', async () => {
    const projectRoot = createProjectRoot('implement-complete');
    seedTaskSpec(projectRoot, '001', 'feature-a', 'Active', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'implement',
      status: 'active',
    });

    const result = await runRoll({
      projectRoot,
      taskSpecId: '001',
      slug: 'feature-a',
      confirmStateArtifactConflict: async () => true,
    });

    expect(result.action).toBe('workflow_complete');
    expect(await readTaskSpecStatus(projectRoot, '001', 'feature-a')).toBe('Complete');
  });

  it('locks Complete specs when a non-specify step begins on another task spec', async () => {
    const projectRoot = createProjectRoot('lock-on-advance');
    seedWorkflowConfig(projectRoot);
    seedTaskSpec(projectRoot, '001', 'done-feature', 'Complete', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'implement',
      status: 'complete',
    });
    seedTaskSpec(projectRoot, '002', 'next-feature', 'Active', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'specify',
    });

    const rollResult = await runRoll({
      projectRoot,
      taskSpecId: '002',
      slug: 'next-feature',
      confirmStateArtifactConflict: async () => true,
    });

    expect(rollResult.action).toBe('step_completed');
    expect(await readTaskSpecStatus(projectRoot, '001', 'done-feature')).toBe('Locked');
    expect(await readTaskSpecStatus(projectRoot, '002', 'next-feature')).toBe('Active');
  });

  it('resolves slug from task spec id via resolveTaskSpecSlug', async () => {
    const projectRoot = createProjectRoot('resolve-slug');
    seedTaskSpec(projectRoot, '001', 'my-feature', 'Active');

    await expect(resolveTaskSpecSlug(projectRoot, '001')).resolves.toBe('my-feature');
    await expect(resolveTaskSpecSlug(projectRoot, '999')).rejects.toMatchObject({
      code: 'TASK_SPEC_NOT_FOUND',
    });
  });

  it('locks Complete specs via lockCompleteTaskSpecs', async () => {
    const projectRoot = createProjectRoot('lock-helper');
    seedTaskSpec(projectRoot, '001', 'complete-a', 'Complete');
    seedTaskSpec(projectRoot, '002', 'active-b', 'Active');

    const locked = await lockCompleteTaskSpecs(projectRoot);
    expect(locked).toEqual([{ taskSpecId: '001', slug: 'complete-a' }]);
    expect(await readTaskSpecStatus(projectRoot, '001', 'complete-a')).toBe('Locked');
    expect(await readTaskSpecStatus(projectRoot, '002', 'active-b')).toBe('Active');
  });

  it('reverts Complete to Active when clarify adds unimplemented requirements', async () => {
    const projectRoot = createProjectRoot('clarify-revert');
    seedTaskSpec(projectRoot, '001', 'shipped', 'Complete', {
      workflowVariantId: 'quick',
      lastCompletedStepId: 'implement',
      status: 'complete',
    });

    const result = await runClarify({
      projectRoot,
      taskSpecId: '001',
      slug: 'shipped',
      clarificationTopic: 'Add SMS notifications',
      addsUnimplementedRequirements: true,
      answerInterview: async (question: InterviewQuestion) => question.recommendedAnswer,
    });

    expect(result.revertedToActive).toBe(true);
    expect(await readTaskSpecStatus(projectRoot, '001', 'shipped')).toBe('Active');
  });

  it('rejects machine-readable writes when status is Locked', async () => {
    const projectRoot = createProjectRoot('locked-core');
    seedTaskSpec(projectRoot, '001', 'locked', 'Locked');

    await expect(setTaskSpecStatus(projectRoot, '001', 'locked', 'Active')).rejects.toBeInstanceOf(
      CoreMutationError,
    );

    await expect(
      updateSpecFrontmatter(projectRoot, '001', 'locked', { owner: 'team' }),
    ).rejects.toBeInstanceOf(CoreMutationError);

    await expect(
      writeWorkflowState(projectRoot, {
        taskSpecId: '001',
        slug: 'locked',
        workflowVariantId: 'quick',
        lastCompletedStepId: 'specify',
        currentStepId: null,
        status: 'active',
      }),
    ).rejects.toBeInstanceOf(CoreMutationError);
  });

  it('rejects writes to Locked task spec paths via ownership guard', async () => {
    const projectRoot = createProjectRoot('locked-ownership');
    seedTaskSpec(projectRoot, '001', 'frozen', 'Locked');

    await expect(
      assertUserOwnedPathWritable(projectRoot, 'specs/001-frozen/spec.md'),
    ).rejects.toBeInstanceOf(CoreMutationError);
  });

  it('rejects a second Active spec entering implement while another is in progress', async () => {
    const projectRoot = createProjectRoot('implement-guard');
    seedWorkflowConfig(projectRoot);
    mkdirSync(path.join(projectRoot, '.spec-n-roll', 'config'), { recursive: true });
    await writeProjectMetadata(projectRoot, {
      currentTaskSpecId: '001',
      currentTaskSlug: 'in-flight',
      implementationStartedAt: new Date().toISOString(),
    });

    seedTaskSpec(projectRoot, '001', 'in-flight', 'Active', {
      workflowVariantId: 'papercut',
      lastCompletedStepId: 'specify',
      currentStepId: 'implement',
    });
    seedTaskSpec(projectRoot, '002', 'second', 'Active', {
      workflowVariantId: 'papercut',
      lastCompletedStepId: 'specify',
    });

    await expect(
      runRoll({
        projectRoot,
        taskSpecId: '002',
        slug: 'second',
        confirmStateArtifactConflict: async () => true,
      }),
    ).rejects.toMatchObject({ code: 'IMPLEMENT_IN_PROGRESS' });
  });
});
