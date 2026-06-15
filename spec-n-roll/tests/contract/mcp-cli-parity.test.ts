import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import { readSpecFrontmatter } from '../../src/sdk/core/frontmatter.js';
import { readProjectMetadata, writeProjectMetadata } from '../../src/sdk/core/project-metadata.js';
import { setTaskCheckboxes } from '../../src/sdk/core/task-checkboxes.js';
import { instantiateStepOutput } from '../../src/sdk/core/templates.js';
import { readWorkflowState, writeWorkflowState } from '../../src/sdk/core/workflow-state.js';

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

  it('step init via CLI matches core runStepInit', async () => {
    const { createDefaultWorkflowConfig } = await import('../../src/sdk/init.js');
    const { createDefaultSetListsFile } = await import('../../src/sdk/setlists/index.js');
    const { WORKFLOW_CONFIG_RELATIVE_PATH } = await import('../../src/sdk/workflow/artifacts.js');
    const { runStepInit } = await import('../../src/sdk/core/step-lifecycle.js');

    async function seedLifecycleProject(suffix: string): Promise<string> {
      const projectRoot = createTempProject(`step-init-${suffix}`);
      const specDir = path.join(projectRoot, 'specs', '007-step-manifesto-setlists');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(path.join(specDir, 'spec.md'), '# Step manifesto setlists\n', 'utf8');
      mkdirSync(path.join(projectRoot, '.spec-n-roll', 'config'), { recursive: true });

      const workflowConfig = createDefaultWorkflowConfig({
        toolkitVersion: '0.1.2',
        selectedAgentIds: ['cursor'],
      });
      writeFileSync(
        path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH),
        JSON.stringify(workflowConfig),
        'utf8',
      );
      writeFileSync(
        path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
        JSON.stringify(createDefaultSetListsFile()),
        'utf8',
      );

      await writeWorkflowState(projectRoot, {
        taskSpecId: '007',
        slug: 'step-manifesto-setlists',
        workflowVariantId: 'quick',
        lastCompletedStepId: 'specify',
        status: 'active',
      });

      return projectRoot;
    }

    const cliProject = await seedLifecycleProject('cli');
    const coreProject = await seedLifecycleProject('core');

    const fromCli = runCliJson(cliProject, [
      'step',
      'init',
      '--task-spec-id',
      '007',
      '--slug',
      'step-manifesto-setlists',
      '--step-id',
      'plan',
    ]) as {
      blocking: boolean;
      taskSpecId?: string;
      stepId?: string;
      setListId?: string;
      workflowState?: { lifecycle?: { activeStepId?: string; status?: string } };
    };

    const fromCore = await runStepInit(coreProject, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'plan',
    });

    expect(fromCli).toMatchObject({
      blocking: fromCore.blocking,
      taskSpecId: fromCore.taskSpecId,
      stepId: fromCore.stepId,
      setListId: fromCore.setListId,
      workflowState: {
        lifecycle: {
          activeStepId: 'plan',
          status: 'in-progress',
        },
      },
    });
    expect(fromCore.blocking).toBe(false);
  }, 15_000);

  it('step finalize via CLI matches core runStepFinalize after init', async () => {
    const projectRoot = createTempProject('step-finalize');
    mkdirSync(path.join(projectRoot, 'specs', '007-step-manifesto-setlists'), { recursive: true });
    mkdirSync(path.join(projectRoot, '.spec-n-roll', 'config'), { recursive: true });

    const { createDefaultWorkflowConfig } = await import('../../src/sdk/init.js');
    const { createDefaultSetListsFile } = await import('../../src/sdk/setlists/index.js');
    const { WORKFLOW_CONFIG_RELATIVE_PATH } = await import('../../src/sdk/workflow/artifacts.js');
    const { runStepInit } = await import('../../src/sdk/core/step-lifecycle.js');

    const workflowConfig = createDefaultWorkflowConfig({
      toolkitVersion: '0.1.2',
      selectedAgentIds: ['cursor'],
    });
    writeFileSync(
      path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH),
      JSON.stringify(workflowConfig),
      'utf8',
    );
    writeFileSync(
      path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
      JSON.stringify(createDefaultSetListsFile()),
      'utf8',
    );

    await writeWorkflowState(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      workflowVariantId: 'quick',
      lastCompletedStepId: 'specify',
      status: 'active',
    });

    await runStepInit(projectRoot, {
      taskSpecId: '007',
      slug: 'step-manifesto-setlists',
      stepId: 'tasks',
    });

    const fromCli = runCliJson(projectRoot, [
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
    ]) as { workflowState: { lastCompletedStepId: string | null } };

    const fromCore = await readWorkflowState(projectRoot, '007', 'step-manifesto-setlists');
    expect(fromCli.workflowState.lastCompletedStepId).toBe('tasks');
    expect(fromCore?.lastCompletedStepId).toBe('tasks');
    expect(fromCore?.lifecycle?.status).toBe('completed');
  });

  it('set-list list via CLI matches core read', async () => {
    const projectRoot = createTempProject('set-list-list');
    const { createDefaultWorkflowConfig } = await import('../../src/sdk/init.js');
    const { WORKFLOW_CONFIG_RELATIVE_PATH } = await import('../../src/sdk/workflow/artifacts.js');
    const { loadSetListReadResult } = await import('../../src/sdk/set-list.js');

    mkdirSync(path.join(projectRoot, '.spec-n-roll', 'config'), { recursive: true });
    writeFileSync(
      path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH),
      JSON.stringify(
        createDefaultWorkflowConfig({
          toolkitVersion: '0.1.2',
          selectedAgentIds: ['cursor'],
        }),
      ),
      'utf8',
    );
    writeFileSync(
      path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
      JSON.stringify((await import('../../src/sdk/setlists/index.js')).createDefaultSetListsFile()),
      'utf8',
    );

    const fromCli = runCliJson(projectRoot, ['set-list', 'list']);
    const fromCore = await loadSetListReadResult(projectRoot, {});
    expect(fromCli).toEqual(fromCore);
  });

  it('repository workflow types list via CLI matches MCP handler', async () => {
    const { executeRepositoryWorkflowTypesList } =
      await import('../../src/mcp/repository-workflow-tool-handlers.js');

    const fromCli = runCliJson(process.cwd(), ['repository-workflow', 'types', 'list']);
    const fromMcp = executeRepositoryWorkflowTypesList();

    expect(fromCli).toEqual(fromMcp);
    expect(
      (fromCli as { workflowTypes: Array<{ id: string }> }).workflowTypes.map((entry) => entry.id),
    ).toEqual(['repository-onboarding', 'repository-drift']);
  });

  it('repository workflow plan via CLI matches MCP handler', async () => {
    const { copyRepositoryWorkflowFixture } = await import('../helpers/repository-workflows.js');
    const { executeRepositoryWorkflowPlan } =
      await import('../../src/mcp/repository-workflow-tool-handlers.js');

    const projectRoot = await copyRepositoryWorkflowFixture('large-repo', 'parity-plan');
    tempDirs.push(projectRoot);

    const fromCli = runCliJson(projectRoot, [
      'repository-workflow',
      'plan',
      '--workflow-type-id',
      'repository-onboarding',
      '--max-product-areas',
      '5',
    ]);

    const fromMcp = await executeRepositoryWorkflowPlan(projectRoot, {
      workflowTypeId: 'repository-onboarding',
      bounds: {
        maxProductAreas: 5,
      },
    });

    expect(fromCli).toEqual(fromMcp);
    expect(
      (fromCli as { recommendedPlan: { includedPaths: string[]; omittedPaths: string[] } })
        .recommendedPlan,
    ).toMatchObject({
      bounds: { maxProductAreas: 5 },
      includedPaths: expect.arrayContaining(['src/areas/area-01']),
      omittedPaths: expect.arrayContaining(['src/areas/area-24']),
    });
    expect(
      (fromCli as { nextSuggestedScopedRun?: { includedPaths: string[] } }).nextSuggestedScopedRun
        ?.includedPaths.length,
    ).toBeGreaterThan(0);
  });

  it('repository_workflow_report_read via CLI matches core read', async () => {
    const projectRoot = createTempProject('repository-report-read');
    const specDir = path.join(projectRoot, 'specs', '001-report-parity');
    mkdirSync(specDir, { recursive: true });

    const specifyOutputRef = 'specs/001-report-parity/spec.md';
    const reportPath = 'specs/001-report-parity/repository-workflow-report.md';
    const reportMarkdown = [
      '# Repository Workflow Report',
      '',
      '## Scope',
      '',
      '- Workflow type: Repository Onboarding',
      '- Included paths: src/greeting',
      '',
      '## Specify Output',
      '',
      `- [spec.md](${specifyOutputRef})`,
      '',
      '## Evidence Summary',
      '',
      '### Confirmed Facts',
      '',
      '- ev-1: Returns greeting (src/greeting/greet.ts:greet)',
      '',
      '## Drift Findings',
      '',
      'No drift findings for onboarding runs.',
      '',
      '## Test Gaps',
      '',
      'No explicit test gaps identified.',
      '',
      '## Assumptions',
      '',
      '- Greeting is user-facing.',
      '',
      '## Limitations',
      '',
      'Living-spec and test files are not modified during specify.',
      '',
      '## Recommended Next Steps',
      '',
      '- clarify',
      '',
    ].join('\n');
    writeFileSync(path.join(specDir, 'repository-workflow-report.md'), reportMarkdown, 'utf8');

    const { loadRepositoryWorkflowReportReadResult } =
      await import('../../src/sdk/repository-workflow.js');
    const { readRepositoryWorkflowReport } = await import('../../src/sdk/repository/report.js');

    const fromCli = runCliJson(projectRoot, [
      'repository-workflow',
      'report',
      'read',
      '--task-spec-id',
      '001',
    ]);
    const fromCore = await readRepositoryWorkflowReport(projectRoot, '001', 'report-parity');
    const fromLoader = await loadRepositoryWorkflowReportReadResult(
      projectRoot,
      '001',
      'report-parity',
    );

    expect(fromCli).toEqual(fromCore);
    expect(fromLoader).toEqual(fromCore);
    expect(fromCore).toMatchObject({
      taskSpecId: '001',
      slug: 'report-parity',
      reportPath,
      specifyOutputRef,
    });
    expect(fromCore.markdown).toContain('## Scope');
    expect(fromCore.markdown).toContain('[spec.md](specs/001-report-parity/spec.md)');
  });

  it('set-list triage via CLI matches core triage', async () => {
    const projectRoot = createTempProject('set-list-triage');
    const { createDefaultWorkflowConfig } = await import('../../src/sdk/init.js');
    const { WORKFLOW_CONFIG_RELATIVE_PATH } = await import('../../src/sdk/workflow/artifacts.js');
    const { runSetListTriage } = await import('../../src/sdk/setlists/index.js');

    mkdirSync(path.join(projectRoot, '.spec-n-roll', 'config'), { recursive: true });
    writeFileSync(
      path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH),
      JSON.stringify(
        createDefaultWorkflowConfig({
          toolkitVersion: '0.1.2',
          selectedAgentIds: ['cursor'],
        }),
      ),
      'utf8',
    );
    writeFileSync(
      path.join(projectRoot, '.spec-n-roll/config/set-lists.json'),
      JSON.stringify((await import('../../src/sdk/setlists/index.js')).createDefaultSetListsFile()),
      'utf8',
    );

    const intent = 'fix typo in readme';
    const fromCli = runCliJson(projectRoot, ['set-list', 'triage', '--intent', intent]);
    const fromCore = await runSetListTriage(projectRoot, intent);
    expect(fromCli).toEqual(fromCore);
    expect((fromCore as { selectedId: string }).selectedId).toBe('papercut');
  });
});
