import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import { readSpecFrontmatter } from '../../src/core/frontmatter.js';
import { readProjectMetadata, writeProjectMetadata } from '../../src/core/project-metadata.js';
import { setTaskCheckboxes } from '../../src/core/task-checkboxes.js';
import { instantiateStepOutput } from '../../src/core/templates.js';
import { readWorkflowState, writeWorkflowState } from '../../src/core/workflow-state.js';

const tempDirs: string[] = [];
const cliPath = path.resolve('dist/cli/index.js');

/**
 * Creates a temporary project directory for parity tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-parity-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Runs a CLI subcommand in a project directory and returns parsed JSON stdout.
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

describe('MCP/CLI parity', () => {
  it('workflow_state_write produces identical file outcome via CLI and core read', async () => {
    const projectRoot = createTempProject('workflow-write');
    mkdirSync(path.join(projectRoot, 'specs', '001-sample-feature'), { recursive: true });

    runCliJson(projectRoot, [
      'workflow',
      'state',
      'write',
      '--task-spec-id',
      '001',
      '--workflow-variant-id',
      'quick',
      '--status',
      'active',
    ]);

    const fromCore = await readWorkflowState(projectRoot, '001', 'sample-feature');
    expect(fromCore.taskSpecId).toBe('001');
    expect(fromCore.slug).toBe('sample-feature');
    expect(fromCore.workflowVariantId).toBe('quick');
    expect(fromCore.status).toBe('active');
  });

  it('workflow_state_read via CLI matches core read', async () => {
    const projectRoot = createTempProject('workflow-read');
    mkdirSync(path.join(projectRoot, 'specs', '001-read-parity'), { recursive: true });

    await writeWorkflowState(projectRoot, {
      taskSpecId: '001',
      slug: 'read-parity',
      workflowVariantId: 'quick',
      lastCompletedStepId: 'specify',
      currentStepId: null,
      status: 'active',
    });

    const fromCli = runCliJson(projectRoot, ['workflow', 'state', 'read', '--task-spec-id', '001']);
    const fromCore = await readWorkflowState(projectRoot, '001', 'read-parity');
    expect(fromCli).toEqual(fromCore);
  });

  it('task_spec_status_set via CLI matches core lifecycle write', async () => {
    const projectRoot = createTempProject('task-status');
    const specDir = path.join(projectRoot, 'specs', '001-status-parity');
    mkdirSync(specDir, { recursive: true });

    await instantiateStepOutput(projectRoot, '001', 'status-parity', 'specify', {
      frontmatter: { status: 'Active' },
    });

    runCliJson(projectRoot, ['task', 'status', 'set', '--task-spec-id', '001', 'Complete']);

    const specContent = readFileSync(path.join(specDir, 'spec.md'), 'utf8');
    expect(specContent).toContain('status: Complete');
  });

  it('project_metadata_read and write via CLI match core operations', async () => {
    const projectRoot = createTempProject('metadata');
    mkdirSync(path.join(projectRoot, '.spec-n-roll', 'config'), { recursive: true });
    mkdirSync(path.join(projectRoot, 'specs', '002-active-task'), { recursive: true });

    await writeProjectMetadata(projectRoot, { nextTaskSpecId: 1 });

    runCliJson(projectRoot, [
      'project',
      'metadata',
      'write',
      '--next-task-spec-id',
      '3',
      '--current-task-spec-id',
      '002',
    ]);

    const fromCli = runCliJson(projectRoot, ['project', 'metadata', 'read']);
    const fromCore = await readProjectMetadata(projectRoot);
    expect(fromCli).toEqual(fromCore);
    expect(fromCore?.nextTaskSpecId).toBe(3);
    expect(fromCore?.currentTaskSlug).toBe('active-task');
  }, 15_000);

  it('task_checkbox_set via CLI matches core checkbox updates', async () => {
    const projectRoot = createTempProject('checkbox');
    const specDir = path.join(projectRoot, 'specs', '001-checkbox-parity');
    mkdirSync(specDir, { recursive: true });

    writeFileSync(path.join(specDir, 'tasks.md'), '# Tasks\n\n- [ ] T100 Example task\n', 'utf8');

    runCliJson(projectRoot, [
      'task',
      'checkbox',
      'set',
      'true',
      '--task-spec-id',
      '001',
      '--task-id',
      'T100',
    ]);

    const tasksContent = readFileSync(path.join(specDir, 'tasks.md'), 'utf8');
    expect(tasksContent).toContain('- [x] T100 Example task');

    const coreResult = await setTaskCheckboxes(
      projectRoot,
      '001',
      'checkbox-parity',
      ['T100'],
      true,
    );
    expect(coreResult).toEqual([{ taskId: 'T100', completed: true }]);
  });

  it('step_output_instantiate via CLI matches core template instantiation', async () => {
    const projectRoot = createTempProject('instantiate');
    mkdirSync(path.join(projectRoot, 'specs', '002-cli-parity'), { recursive: true });

    runCliJson(projectRoot, [
      'step',
      'instantiate',
      '--task-spec-id',
      '002',
      '--step-id',
      'specify',
      '--frontmatter',
      'status=Active',
      '--frontmatter',
      'title=Parity Feature',
    ]);

    const specPath = path.join(projectRoot, 'specs', '002-cli-parity', 'spec.md');
    const cliContent = readFileSync(specPath, 'utf8');
    expect(cliContent).toContain('status: Active');
    expect(cliContent).toContain('title: Parity Feature');
  });

  it('spec_frontmatter_update via CLI matches core frontmatter merge', async () => {
    const projectRoot = createTempProject('frontmatter');
    mkdirSync(path.join(projectRoot, 'specs', '001-frontmatter-parity'), { recursive: true });

    await instantiateStepOutput(projectRoot, '001', 'frontmatter-parity', 'specify', {
      frontmatter: { status: 'Active', title: 'Original' },
    });

    runCliJson(projectRoot, [
      'spec',
      'frontmatter',
      'update',
      '--task-spec-id',
      '001',
      '--field',
      'title=Updated Title',
      '--field',
      'owner=team-a',
    ]);

    const frontmatter = await readSpecFrontmatter(projectRoot, '001', 'frontmatter-parity');
    expect(frontmatter.title).toBe('Updated Title');
    expect(frontmatter.owner).toBe('team-a');

    const specContent = readFileSync(
      path.join(projectRoot, 'specs', '001-frontmatter-parity', 'spec.md'),
      'utf8',
    );
    expect(specContent).toContain('title: Updated Title');
    expect(specContent).toContain('owner: team-a');
  });
});
