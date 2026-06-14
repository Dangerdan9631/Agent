import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { LOCAL_INSTALL_LAYOUT_VERSION } from '../../src/cli/local-install-integrity.js';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { installProjectBinaries } from '../../src/cli/local-binaries.js';
import { runInit } from '../../src/cli/commands/init.js';
import { runConfigAgentAdd } from '../../src/cli/commands/config-agent-add.js';
import { CoreMutationError } from '../../src/core/errors.js';
import { buildDelegatedCliEnv } from '../../src/cli/dispatcher.js';
import { readProjectMetadata } from '../../src/core/project-metadata.js';
import {
  lockCompleteTaskSpecs,
  readTaskSpecStatus,
  setTaskSpecStatus,
} from '../../src/core/task-lifecycle.js';
import { workflowConfigSchema } from '../../src/config/schema.js';
import { runTriageWithExtensions, loadExtensionRegistry } from '../../src/extensions/hooks.js';
import { STUB_MARKER } from '../../src/living-specs/step-stubs.js';
import { runImplement } from '../../src/specs/implement.js';
import type { InterviewQuestion } from '../../src/specs/interview.js';
import { runSpecify } from '../../src/specs/specify.js';
import type { PartialRecoveryChoice } from '../../src/workflow/engine.js';
import { runRoll } from '../../src/workflow/engine.js';
import { writeWorkflowState } from '../../src/core/workflow-state.js';

const tempDirs: string[] = [];
const repoRoot = path.resolve('.');
const dispatcherPath = path.resolve('dist/cli/dispatcher.js');
const fullCliPath = path.resolve('dist/cli/index.js');
const dispatcherPackageVersion = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as { version: string };
const docsDir = path.join(repoRoot, 'docs');

/**
 * Creates a temporary project directory tracked for cleanup.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-quickstart-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Runs the full CLI with arguments in a project directory.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the script path.
 * @returns Spawn result with stdout and stderr captured.
 */
function runFullCli(
  projectRoot: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [fullCliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: buildDelegatedCliEnv(process.env),
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
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

beforeAll(() => {
  if (!existsSync(fullCliPath) || !existsSync(dispatcherPath)) {
    throw new Error('Build output missing. Run `npm run build` before integration tests.');
  }
});

describe('quickstart scenario 1 self-contained: init produces bundled layout', () => {
  it('installs layout v1 without toolkitPackageRoot and with dist/cli/index.js', async () => {
    const projectRoot = createTempProject('self-contained');
    await runInit({ projectRoot, agents: ['cursor'] });

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'mcp', 'server.js'))).toBe(true);

    const installManifest = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
      toolkitPackageRoot?: string;
    };
    expect(installManifest.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(installManifest.toolkitPackageRoot).toBeUndefined();
    expect(installManifest.toolkitVersion).toBeTruthy();

    for (const launcherName of readdirSync(path.join(cliDir, 'bin'))) {
      if (launcherName.endsWith('.cmd')) {
        continue;
      }
      const launcher = readFileSync(path.join(cliDir, 'bin', launcherName), 'utf8');
      expect(launcher).not.toContain('toolkitPackageRoot');
    }

    const versionResult = spawnSync(process.execPath, [dispatcherPath, 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(versionResult.status).toBe(0);
    expect(versionResult.stdout).toContain('invocation: local');
  }, 30_000);
});

describe('quickstart scenario 1: initialize project with multiple agents', () => {
  it('installs binaries, MCP config, workflow config, platform scripts, and metadata', async () => {
    const projectRoot = createTempProject('scenario-1');
    const preExistingMcp = path.join(projectRoot, '.cursor', 'mcp.json');
    mkdirSync(path.dirname(preExistingMcp), { recursive: true });
    writeFileSync(
      preExistingMcp,
      readFileSync(
        path.resolve('tests/fixtures/pre-existing-agent-mcp-config-templates/.cursor/mcp.json'),
        'utf8',
      ),
      'utf8',
    );

    await runInit({ projectRoot, agents: ['cursor', 'claude-code'] });

    expect(existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll'))).toBe(
      true,
    );
    expect(
      existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp')),
    ).toBe(true);
    expect(
      existsSync(path.join(projectRoot, '.spec-n-roll', 'scripts', 'check-prerequisites.sh')),
    ).toBe(true);
    expect(
      existsSync(path.join(projectRoot, '.spec-n-roll', 'scripts', 'check-prerequisites.ps1')),
    ).toBe(true);

    const cursorMcp = JSON.parse(readFileSync(preExistingMcp, 'utf8')) as {
      mcpServers: Record<string, { args?: string[] }>;
    };
    expect(cursorMcp.mcpServers['other-server']).toBeDefined();
    expect(cursorMcp.mcpServers['spec-n-roll'].args).toContain(
      '.spec-n-roll/cli/bin/spec-n-roll-mcp',
    );

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    for (const workflow of workflowConfig.workflows) {
      expect(workflow.steps[0]).toBe('specify');
    }

    const metadata = await readProjectMetadata(projectRoot);
    expect(metadata?.nextTaskSpecId).toBe(1);
  });
});

describe('quickstart scenario 1b: add agent MCP configuration', () => {
  it('adds a new agent without changing existing MCP configs and is idempotent', async () => {
    const projectRoot = createTempProject('scenario-1b');
    await runInit({ projectRoot, agents: ['cursor'] });

    const cursorBefore = readFileSync(path.join(projectRoot, '.cursor', 'mcp.json'), 'utf8');

    await runConfigAgentAdd({ projectRoot, agents: ['copilot'] });
    expect(existsSync(path.join(projectRoot, '.github', 'copilot-instructions.md'))).toBe(true);
    expect(existsSync(path.join(projectRoot, '.vscode', 'mcp.json'))).toBe(true);

    const cursorAfter = readFileSync(path.join(projectRoot, '.cursor', 'mcp.json'), 'utf8');
    expect(cursorAfter).toBe(cursorBefore);

    await runConfigAgentAdd({ projectRoot, agents: ['copilot'] });
    const copilotMcp = JSON.parse(
      readFileSync(path.join(projectRoot, '.vscode', 'mcp.json'), 'utf8'),
    ) as { mcpServers: Record<string, unknown> };
    expect(Object.keys(copilotMcp.mcpServers).filter((id) => id === 'spec-n-roll')).toHaveLength(1);
  });
});

describe('quickstart scenario 2c: dispatcher version-skew delegation', () => {
  it('delegates to pinned local toolkit version regardless of dispatcher package version', async () => {
    const projectRoot = createTempProject('scenario-2c');
    const fixtureRoot = path.resolve('tests/fixtures/local-bundle-version-a');
    await installProjectBinaries(projectRoot, fixtureRoot);

    const localCliPath = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll');
    const delegated = spawnSync(process.execPath, [dispatcherPath, 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(delegated.status).toBe(0);
    expect(delegated.stdout).toContain('toolkit version: 0.9.0-a');
    expect(delegated.stdout).toContain(`dispatcher version: ${dispatcherPackageVersion.version}`);
    expect(delegated.stdout).toContain('invocation: local');
    expect(delegated.stdout).not.toContain('invocation: global');
    expect(delegated.stdout.replace(/\\/g, '/')).toContain(localCliPath.replace(/\\/g, '/'));
  }, 30_000);
});

describe('quickstart scenario 6: corrupt install fails clearly', () => {
  it('dispatcher errors on incomplete install without silent global fallback', async () => {
    const projectRoot = createTempProject('scenario-6-corrupt');
    await runInit({ projectRoot, agents: ['cursor'] });

    rmSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'dist', 'cli', 'index.js'));

    const corrupt = spawnSync(process.execPath, [dispatcherPath, 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(corrupt.status).not.toBe(0);
    expect(corrupt.stderr).toMatch(/incomplete/i);
    expect(corrupt.stderr).toMatch(/update/i);
    expect(corrupt.stdout).not.toContain('invocation: global');

    const globalVersion = spawnSync(process.execPath, [dispatcherPath, '--global', 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(globalVersion.status).toBe(0);
    expect(globalVersion.stdout).toContain('toolkit version');
  }, 30_000);
});

describe('quickstart scenario 2: dispatcher exec local full CLI', () => {
  it('delegates to local CLI and supports --global bypass with combined version report', async () => {
    const projectRoot = createTempProject('scenario-2');
    await runInit({ projectRoot, agents: ['cursor'] });

    const localCliPath = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll');
    const localPackageVersion = JSON.parse(
      readFileSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'package.json'), 'utf8'),
    ) as { version: string };

    const delegated = spawnSync(process.execPath, [dispatcherPath, 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(delegated.status).toBe(0);
    expect(delegated.stdout).toContain(`toolkit version: ${localPackageVersion.version}`);
    expect(delegated.stdout).toContain(`dispatcher version: ${dispatcherPackageVersion.version}`);
    expect(delegated.stdout).toContain('invocation: local');
    expect(delegated.stdout.replace(/\\/g, '/')).toContain(localCliPath.replace(/\\/g, '/'));

    const globalVersion = spawnSync(process.execPath, [dispatcherPath, '--global', 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(globalVersion.status).toBe(0);
    expect(globalVersion.stdout).toContain(`toolkit version: ${dispatcherPackageVersion.version}`);
    expect(globalVersion.stdout).toContain('invocation: global');
    expect(globalVersion.stdout).not.toContain('dispatcher version:');
    expect(globalVersion.stdout).not.toContain('.spec-n-roll/cli/bin/spec-n-roll');

    const localBinaryVersion = spawnSync(process.execPath, [localCliPath, 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: buildDelegatedCliEnv(process.env),
    });
    expect(localBinaryVersion.status).toBe(0);
    expect(localBinaryVersion.stdout).toContain(`toolkit version: ${localPackageVersion.version}`);
    expect(localBinaryVersion.stdout).toContain('invocation: local');
    expect(localBinaryVersion.stdout).toContain(
      `dispatcher version: ${dispatcherPackageVersion.version}`,
    );
    expect(localBinaryVersion.stdout.replace(/\\/g, '/')).toContain(
      localCliPath.replace(/\\/g, '/'),
    );
  }, 30_000);
});

describe('quickstart scenario 2b: interactive vs non-interactive CLI', () => {
  it('runs subcommands non-interactively and starts the interactive app for bare invocation', async () => {
    const projectRoot = createTempProject('scenario-2b');
    await runInit({ projectRoot, agents: ['cursor'] });

    const help = runFullCli(projectRoot, ['init', '--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('Initialize Spec-N-Roll in a project');

    const bare = runFullCli(projectRoot, []);
    expect(`${bare.stdout}\n${bare.stderr}`).toMatch(
      /Main Menu|Global Home|Local Home|Raw mode is not supported/,
    );
  }, 15_000);
});

describe('quickstart scenario 3: interactive specification with embedded triage', () => {
  it('instantiates spec.md, runs triage and interview, and writes workflow state', async () => {
    const projectRoot = createTempProject('scenario-3');
    await runInit({ projectRoot, agents: ['cursor'] });

    const askedQuestions: string[] = [];
    const result = await runSpecify({
      projectRoot,
      description: 'Add a vague reporting feature',
      answerInterview: async (question: InterviewQuestion) => {
        askedQuestions.push(question.id);
        expect(question.recommendedAnswer.length).toBeGreaterThan(0);
        return question.recommendedAnswer;
      },
    });

    expect(result.workflowVariantId).toBeTruthy();
    expect(askedQuestions.length).toBeGreaterThan(0);
    expect(new Set(askedQuestions).size).toBe(askedQuestions.length);

    const specPath = path.join(
      projectRoot,
      'specs',
      `${result.taskSpecId}-${result.slug}`,
      'spec.md',
    );
    expect(existsSync(specPath)).toBe(true);
    const specContent = readFileSync(specPath, 'utf8');
    expect(specContent).toContain('status: Active');
    expect(specContent).not.toMatch(/<!-- FILL:/);

    const status = await readTaskSpecStatus(projectRoot, result.taskSpecId, result.slug);
    expect(status).toBe('Active');
  });
});

describe('quickstart scenario 4: /spec-n-roll advances workflow state', () => {
  it('advances to the next tier step and tolerates missing plan.md on quick tier', async () => {
    const projectRoot = createTempProject('scenario-4');
    await runInit({ projectRoot, agents: ['cursor'] });

    const specifyResult = await runSpecify({
      projectRoot,
      description: 'Add email notification when an order ships',
      setListOverride: 'quick',
      answerInterview: async (question: InterviewQuestion) => question.recommendedAnswer,
    });

    const rollResult = await runRoll({
      projectRoot,
      taskSpecId: specifyResult.taskSpecId,
      slug: specifyResult.slug,
      confirmStateArtifactConflict: async () => true,
    });

    expect(rollResult.action).toBe('step_completed');
    if (rollResult.action === 'step_completed') {
      expect(rollResult.stepId).toBe('tasks');
    }
    expect(
      existsSync(
        path.join(
          projectRoot,
          'specs',
          `${specifyResult.taskSpecId}-${specifyResult.slug}`,
          'plan.md',
        ),
      ),
    ).toBe(false);
  });
});

describe('quickstart scenario 5: interrupted step recovery', () => {
  /**
   * Seeds a quick-tier project with a partial tasks.md artifact for recovery tests.
   *
   * @param suffix - Unique suffix for the temp project name.
   * @returns Project root and specify result metadata.
   */
  async function seedPartialTasksProject(suffix: string): Promise<{
    projectRoot: string;
    taskSpecId: string;
    slug: string;
    partialPath: string;
  }> {
    const projectRoot = createTempProject(`scenario-5-${suffix}`);
    await runInit({ projectRoot, agents: ['cursor'] });
    const specifyResult = await runSpecify({
      projectRoot,
      description: 'Add password reset email',
      setListOverride: 'quick',
      answerInterview: async (question: InterviewQuestion) => question.recommendedAnswer,
    });
    const partialPath = path.join(
      projectRoot,
      'specs',
      `${specifyResult.taskSpecId}-${specifyResult.slug}`,
      'tasks.md',
    );
    writeFileSync(partialPath, '# Partial tasks\n', 'utf8');
    return {
      projectRoot,
      taskSpecId: specifyResult.taskSpecId,
      slug: specifyResult.slug,
      partialPath,
    };
  }

  it('offers restart, cancel, and force-clean choices from the step manifest', async () => {
    const seeded = await seedPartialTasksProject('choices');
    const choices: PartialRecoveryChoice[] = [];

    await runRoll({
      projectRoot: seeded.projectRoot,
      taskSpecId: seeded.taskSpecId,
      slug: seeded.slug,
      confirmPartialRecovery: async (prompt) => {
        choices.push(...prompt.choices);
        return 'cancel';
      },
      confirmStateArtifactConflict: async () => true,
    });

    expect(choices).toEqual(['restart', 'cancel', 'force-clean']);
  });

  it('cancel leaves partial artifacts and marks the workflow paused', async () => {
    const seeded = await seedPartialTasksProject('cancel');
    const result = await runRoll({
      projectRoot: seeded.projectRoot,
      taskSpecId: seeded.taskSpecId,
      slug: seeded.slug,
      confirmPartialRecovery: async () => 'cancel',
      confirmStateArtifactConflict: async () => true,
    });

    expect(result.action).toBe('paused');
    expect(existsSync(seeded.partialPath)).toBe(true);
  });

  it('restart and force-clean complete the interrupted step', async () => {
    for (const choice of ['restart', 'force-clean'] as const) {
      const seeded = await seedPartialTasksProject(choice);
      const result = await runRoll({
        projectRoot: seeded.projectRoot,
        taskSpecId: seeded.taskSpecId,
        slug: seeded.slug,
        confirmPartialRecovery: async () => choice,
        confirmStateArtifactConflict: async () => true,
      });

      expect(result.action).toBe('step_completed');
      if (result.action === 'step_completed') {
        expect(result.stepId).toBe('tasks');
      }
    }
  });
});

describe('quickstart scenario 6: living spec and TDD entry', () => {
  it('updates living specs, generates stubs, and starts the red phase before code', async () => {
    const projectRoot = createTempProject('scenario-6');
    mkdirSync(path.join(projectRoot, 'living-specs'), { recursive: true });
    const specDir = path.join(projectRoot, 'specs', '001-auth-flow');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, 'spec.md'), '---\nstatus: Active\n---\n\n# Auth\n', 'utf8');
    await writeWorkflowState(projectRoot, {
      taskSpecId: '001',
      slug: 'auth-flow',
      workflowVariantId: 'quick',
      lastCompletedStepId: 'tasks',
      currentStepId: 'implement',
      status: 'active',
    });

    const result = await runImplement({
      projectRoot,
      taskSpecId: '001',
      slug: 'auth-flow',
      featureDescription: 'Add OAuth login for user authentication',
      scenariosToAdd: [
        {
          name: 'User signs in',
          steps: ['Given an auth provider', 'When the user signs in', 'Then access is granted'],
        },
      ],
    });

    expect(result.livingSpecUpdated).toBe(true);
    expect(result.tddPhase).toBe('red');
    expect(result.stubsGenerated).toBeGreaterThan(0);
    expect(result.testRun.failedCount).toBeGreaterThan(0);

    const featureFiles = readdirSync(path.join(projectRoot, 'living-specs'));
    expect(featureFiles.some((name) => name.endsWith('.feature'))).toBe(true);
    const featureContent = readFileSync(
      path.join(projectRoot, 'living-specs', featureFiles[0]!),
      'utf8',
    );
    expect(featureContent).toContain('@spec-n-roll-001');

    const stubPath = path.join(projectRoot, 'tests', 'step-definitions', 'living-spec-stubs.mjs');
    expect(readFileSync(stubPath, 'utf8')).toContain(STUB_MARKER);
  });
});

describe('quickstart scenario 7: TDD vertical slice enforcement', () => {
  it('fails before implementation, then passes after minimal step implementation', async () => {
    const projectRoot = createTempProject('scenario-7');
    mkdirSync(path.join(projectRoot, 'living-specs'), { recursive: true });
    const specDir = path.join(projectRoot, 'specs', '001-slice');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, 'spec.md'), '---\nstatus: Active\n---\n\n# Slice\n', 'utf8');
    await writeWorkflowState(projectRoot, {
      taskSpecId: '001',
      slug: 'slice',
      workflowVariantId: 'quick',
      lastCompletedStepId: 'tasks',
      currentStepId: 'implement',
      status: 'active',
    });

    const entry = await runImplement({
      projectRoot,
      taskSpecId: '001',
      slug: 'slice',
      featureDescription: 'Return greeting for user authentication',
      scenariosToAdd: [
        {
          name: 'Greeting returns hello',
          steps: [
            'Given the greeting service is available',
            'When a client requests a greeting',
            'Then the response contains hello',
          ],
        },
      ],
    });
    expect(entry.testRun.success).toBe(false);

    const stepDir = path.join(projectRoot, 'tests', 'step-definitions');
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(
      path.join(stepDir, 'greeting.mjs'),
      `import { Given, When, Then } from '@cucumber/cucumber';
Given('the greeting service is available', function () {});
When('a client requests a greeting', function () {});
Then('the response contains hello', function () {});
`,
      'utf8',
    );

    const green = await runImplement({
      projectRoot,
      taskSpecId: '001',
      slug: 'slice',
      featureDescription: 'Return greeting for user authentication',
      phase: 'green',
      productionCodeWritten: true,
    });
    expect(green.testRun.success).toBe(true);
    expect(green.tddPhase).toBe('green');
  });
});

describe('quickstart scenario 8: safe toolkit update', () => {
  it('is covered by tests/integration/update.test.ts', () => {
    expect(existsSync(path.join(repoRoot, 'tests', 'integration', 'update.test.ts'))).toBe(true);
  });
});

describe('quickstart scenario 9: extension workflow variant', () => {
  it('replaces built-in triage via import() and falls back when disabled', async () => {
    const projectRoot = createTempProject('scenario-9');
    const extensionDir = path.join(
      projectRoot,
      '.spec-n-roll',
      'config',
      'extensions',
      'custom-triage',
    );
    mkdirSync(extensionDir, { recursive: true });
    writeFileSync(
      path.join(extensionDir, 'triage-handler.mjs'),
      `export async function handler(context) {
  return {
    mode: 'heuristic',
    proposedSetListId: 'papercut',
    proposedWorkflowId: 'papercut',
    rationale: 'Custom extension triage selected papercut.',
    eligibleSetLists: context.enabledSetLists ?? [],
    defaultSetListId: 'quick',
    defaultWorkflowId: context.defaultWorkflowId,
    ambiguous: false,
  };
}
`,
      'utf8',
    );
    writeFileSync(
      path.join(extensionDir, 'manifest.json'),
      JSON.stringify(
        {
          manifestVersion: '1',
          id: 'custom-triage',
          name: 'Custom Triage',
          targetToolkitVersion: '0.1.0',
          steps: [
            {
              id: 'custom-triage-step',
              stepId: 'triage',
              command: 'spec-n-triage',
              entrypoint: '.spec-n-roll/config/extensions/custom-triage/triage-handler.mjs',
              priority: 10,
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    await runInit({ projectRoot, agents: ['cursor'] });
    const configPath = path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      extensions: Array<{ id: string; manifestPath: string; enabled: boolean }>;
    };
    config.extensions.push({
      id: 'custom-triage',
      manifestPath: '.spec-n-roll/config/extensions/custom-triage/manifest.json',
      enabled: true,
    });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    const enabled = await runTriageWithExtensions({
      projectRoot,
      description: 'Cross-cutting platform redesign',
      defaultWorkflowId: 'quick',
      availableWorkflowIds: ['papercut', 'quick', 'full'],
    });
    expect(enabled.proposedSetListId).toBe('papercut');

    config.extensions = config.extensions.map((entry) =>
      entry.id === 'custom-triage' ? { ...entry, enabled: false } : entry,
    );
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    const disabled = await runTriageWithExtensions({
      projectRoot,
      description: 'Cross-cutting platform redesign',
      defaultWorkflowId: 'quick',
      availableWorkflowIds: ['papercut', 'quick', 'full'],
    });
    expect(disabled.proposedSetListId).not.toBe('papercut');
  });
});

describe('quickstart scenario 9b: extension hook validation', () => {
  it('warns and skips hooks targeting unknown step ids', async () => {
    const projectRoot = createTempProject('scenario-9b');
    await runInit({ projectRoot, agents: ['cursor'] });

    const extensionDir = path.join(projectRoot, '.spec-n-roll', 'config', 'extensions', 'hooky');
    mkdirSync(extensionDir, { recursive: true });
    writeFileSync(
      path.join(extensionDir, 'manifest.json'),
      JSON.stringify(
        {
          manifestVersion: '1',
          id: 'hooky',
          name: 'Hooky',
          targetToolkitVersion: '0.1.0',
          hooks: [
            {
              id: 'before-typo',
              event: 'before_typo-step',
              entrypoint: '.spec-n-roll/config/extensions/hooky/hook.mjs',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );
    writeFileSync(
      path.join(extensionDir, 'hook.mjs'),
      'export async function handler() {}\n',
      'utf8',
    );

    const configPath = path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      extensions: Array<{ id: string; manifestPath: string; enabled: boolean }>;
    };
    config.extensions.push({
      id: 'hooky',
      manifestPath: '.spec-n-roll/config/extensions/hooky/manifest.json',
      enabled: true,
    });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    const registry = await loadExtensionRegistry(projectRoot);
    expect(registry.hookWarnings.some((warning) => warning.includes('typo-step'))).toBe(true);
    expect(registry.skippedHooks).toContain('before_typo-step');
  });
});

describe('quickstart scenario 10: task spec lifecycle and locking', () => {
  it('locks Complete specs when another task begins a non-specify step', async () => {
    const projectRoot = createTempProject('scenario-10');
    mkdirSync(path.join(projectRoot, 'specs', '001-done'), { recursive: true });
    mkdirSync(path.join(projectRoot, 'specs', '002-next'), { recursive: true });
    writeFileSync(
      path.join(projectRoot, 'specs', '001-done', 'spec.md'),
      '---\nstatus: Complete\n---\n\n# Done\n',
      'utf8',
    );
    writeFileSync(
      path.join(projectRoot, 'specs', '002-next', 'spec.md'),
      '---\nstatus: Active\n---\n\n# Next\n',
      'utf8',
    );

    const locked = await lockCompleteTaskSpecs(projectRoot);
    expect(locked).toEqual([{ taskSpecId: '001', slug: 'done' }]);
    expect(await readTaskSpecStatus(projectRoot, '001', 'done')).toBe('Locked');

    await expect(setTaskSpecStatus(projectRoot, '001', 'done', 'Active')).rejects.toBeInstanceOf(
      CoreMutationError,
    );
  });
});

describe('quickstart scenario 11: MCP/CLI parity for deterministic mutations', () => {
  it('is covered by tests/contract/mcp-cli-parity.test.ts', () => {
    expect(existsSync(path.join(repoRoot, 'tests', 'contract', 'mcp-cli-parity.test.ts'))).toBe(
      true,
    );
  });
});

describe('quickstart scenario 12: documentation completeness', () => {
  const requiredDocs: Array<{ file: string; mustContain: string[] }> = [
    {
      file: 'workflow.md',
      mustContain: ['/spec-n-specify', '/spec-n-roll', 'living-specs', 'triage'],
    },
    {
      file: 'cli.md',
      mustContain: [
        'init',
        'update',
        'dispatcher',
        'MCP server',
        '--global',
        '--agents',
        '--force',
      ],
    },
    {
      file: 'multi-agent.md',
      mustContain: ['MCP configuration', 'cursor', 'config agent add'],
    },
    {
      file: 'platform-scripts.md',
      mustContain: ['.ps1', '.sh', 'auto-selection'],
    },
    {
      file: 'extension-quickstart.md',
      mustContain: ['before_{stepId}', 'import()', 'workflow.config.json'],
    },
    {
      file: 'extension-reference.md',
      mustContain: ['manifestVersion', 'stepId', 'before_update'],
    },
    {
      file: 'extension-example.md',
      mustContain: ['custom-triage', 'triage-handler.mjs'],
    },
    {
      file: 'updates-and-migrations.md',
      mustContain: ['ownership', '.bak', 'schema migration', 'compatibility'],
    },
  ];

  it.each(requiredDocs)(
    '$file covers SC-008 topics without source inspection',
    ({ file, mustContain }) => {
      const content = readFileSync(path.join(docsDir, file), 'utf8');
      for (const phrase of mustContain) {
        expect(content).toContain(phrase);
      }
    },
  );

  it('lists all primary guides in docs/README.md', () => {
    const readme = readFileSync(path.join(docsDir, 'README.md'), 'utf8');
    for (const doc of requiredDocs.map((entry) => entry.file)) {
      expect(readme).toContain(doc);
    }
  });
});
