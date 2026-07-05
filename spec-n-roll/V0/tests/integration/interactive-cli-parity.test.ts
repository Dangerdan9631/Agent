import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { applyInteractiveAgentAdd } from '../../src/ink/screens/agents/agent-add.js';
import { applyInteractiveAgentRemove } from '../../src/ink/screens/agents/agent-remove.js';
import { applyInteractiveProjectMetadataWrite } from '../../src/ink/screens/project/project-metadata-edit.js';
import { applyInteractiveInit } from '../../src/ink/screens/setup/setup-init.js';
import { applyInteractiveUpdate } from '../../src/ink/screens/setup/setup-update.js';
import { applyInteractiveSpecFrontmatterUpdate } from '../../src/ink/screens/specs/spec-frontmatter-update.js';
import { applyInteractiveStepInstantiate } from '../../src/ink/screens/specs/step-instantiate.js';
import { applyInteractiveTaskCheckboxSet } from '../../src/ink/screens/specs/task-checkbox-set.js';
import { applyInteractiveTaskStatusSet } from '../../src/ink/screens/specs/task-status-set.js';
import { applyInteractiveWorkflowStateWrite } from '../../src/ink/screens/specs/workflow-state.js';

/**
 * Source fixture copied for each interactive parity test project.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Built full CLI entry used for non-interactive parity subprocesses.
 */
const CLI_PATH = path.resolve('dist/cli/index.js');

/**
 * Fixed timestamp injected into Date for byte-equivalent JSON writer comparisons.
 */
const FIXED_NOW = '2026-06-13T12:34:56.000Z';

/**
 * Temporary directories created by this test file and removed after each test.
 */
const tempRoots: string[] = [];

/**
 * Known selected task spec used by the fixture's User Story 2 parity tests.
 */
const ACTIVE_TASK_SPEC = {
  taskSpecId: '001',
  slug: 'active-checkout',
  label: '001-active-checkout',
};

/**
 * Creates an isolated project fixture for one side of a parity comparison.
 *
 * @param prefix - Unique prefix describing the comparison side.
 * @returns Absolute path to the copied project fixture.
 */
async function copyFixtureProject(prefix: string): Promise<string> {
  const tempRoot = path.resolve(
    'node_modules',
    '.tmp',
    `interactive-cli-parity-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  tempRoots.push(tempRoot);
  return tempRoot;
}

/**
 * Creates an empty project root for initialization parity comparisons.
 *
 * @param prefix - Unique prefix describing the comparison side.
 * @returns Absolute path to the empty project root.
 */
async function createEmptyProject(prefix: string): Promise<string> {
  const tempRoot = path.resolve(
    'node_modules',
    '.tmp',
    `interactive-cli-parity-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fse.remove(tempRoot);
  await fse.ensureDir(tempRoot);
  tempRoots.push(tempRoot);
  return tempRoot;
}

/**
 * Collects all project files as UTF-8 text keyed by project-relative path.
 *
 * @param projectRoot - Absolute project root to snapshot.
 * @returns File contents keyed by relative path with POSIX separators.
 */
async function snapshotTextFiles(projectRoot: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();

  async function visit(directory: string): Promise<void> {
    const entries = await fse.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        snapshot.set(
          path.relative(projectRoot, absolutePath).replaceAll(path.sep, '/'),
          await fse.readFile(absolutePath, 'utf8'),
        );
      }
    }
  }

  await visit(projectRoot);
  return snapshot;
}

/**
 * Writes an ESM Date shim that fixes zero-argument Date construction in a subprocess.
 *
 * @param projectRoot - Project root where the shim should be written.
 * @returns File URL suitable for Node's `--import` option.
 */
async function writeDateShim(projectRoot: string): Promise<string> {
  const shimPath = path.join(projectRoot, '.tmp-fixed-date.mjs');
  await fse.writeFile(
    shimPath,
    `const RealDate = Date;
const fixed = new RealDate(${JSON.stringify(FIXED_NOW)});
globalThis.Date = class FixedDate extends RealDate {
  constructor(...args) {
    super(...(args.length === 0 ? [fixed] : args));
  }
  static now() {
    return fixed.getTime();
  }
  static parse(value) {
    return RealDate.parse(value);
  }
  static UTC(...args) {
    return RealDate.UTC(...args);
  }
};
`,
    'utf8',
  );
  return pathToFileURL(shimPath).href;
}

/**
 * Runs the built CLI in a project fixture.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the entrypoint.
 * @param dateShimUrl - Optional Date shim file URL for deterministic timestamps.
 */
function runCli(projectRoot: string, args: string[], dateShimUrl?: string): void {
  const existingNodeOptions = process.env.NODE_OPTIONS;
  const nodeOptions =
    dateShimUrl == null
      ? existingNodeOptions
      : [existingNodeOptions, `--import=${dateShimUrl}`].filter(Boolean).join(' ');
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(nodeOptions != null ? { NODE_OPTIONS: nodeOptions } : {}),
    },
  });

  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

/**
 * Runs a mutation through the interactive helper and equivalent CLI, then compares project files.
 *
 * @param name - Unique comparison name for temporary project directories.
 * @param applyInteractive - Mutation applied through the interactive helper path.
 * @param cliArgs - Equivalent CLI arguments.
 * @param deterministicDate - Whether Date should be fixed for timestamp-writing operations.
 */
async function expectInteractiveCliParity(
  name: string,
  applyInteractive: (projectRoot: string) => Promise<void>,
  cliArgs: string[],
  deterministicDate = false,
): Promise<void> {
  const interactiveRoot = await copyFixtureProject(`${name}-interactive`);
  const cliRoot = await copyFixtureProject(`${name}-cli`);

  if (deterministicDate) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  }

  try {
    await applyInteractive(interactiveRoot);
  } finally {
    if (deterministicDate) {
      vi.useRealTimers();
    }
  }

  const dateShimUrl = deterministicDate ? await writeDateShim(cliRoot) : undefined;
  runCli(cliRoot, cliArgs, dateShimUrl);

  if (dateShimUrl != null) {
    await fse.remove(path.join(cliRoot, '.tmp-fixed-date.mjs'));
  }

  expect(await snapshotTextFiles(interactiveRoot)).toEqual(await snapshotTextFiles(cliRoot));
}

afterEach(async () => {
  vi.useRealTimers();
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

beforeAll(() => {
  if (!existsSync(CLI_PATH)) {
    throw new Error('Build output missing. Run `npm run build` before integration tests.');
  }
});

describe('interactive CLI parity for User Story 2', () => {
  it('matches task.status.set affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'task-status-set',
      async (projectRoot) => {
        await applyInteractiveTaskStatusSet({
          projectRoot,
          taskSpec: ACTIVE_TASK_SPEC,
          status: 'Complete',
        });
      },
      ['task', 'status', 'set', 'Complete', '--task-spec-id', '001'],
    );
  });

  it('matches task.checkbox.set affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'task-checkbox-set',
      async (projectRoot) => {
        await applyInteractiveTaskCheckboxSet({
          projectRoot,
          taskSpec: ACTIVE_TASK_SPEC,
          taskIds: ['T001'],
          completed: true,
        });
      },
      ['task', 'checkbox', 'set', 'true', '--task-spec-id', '001', '--task-id', 'T001'],
    );
  });

  it('matches project.metadata.write affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'project-metadata-write',
      async (projectRoot) => {
        await applyInteractiveProjectMetadataWrite({
          projectRoot,
          metadata: {
            nextTaskSpecId: 4,
            currentTaskSpecId: '002',
            implementationStartedAt: '2026-06-13T12:00:00.000Z',
          },
        });
      },
      [
        'project',
        'metadata',
        'write',
        '--next-task-spec-id',
        '4',
        '--current-task-spec-id',
        '002',
        '--implementation-started-at',
        '2026-06-13T12:00:00.000Z',
      ],
      true,
    );
  });

  it('matches config.agent.add affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'config-agent-add',
      async (projectRoot) => {
        await applyInteractiveAgentAdd({ projectRoot, agents: ['claude-code'] });
      },
      ['config', 'agent', 'add', 'claude-code'],
    );
  });

  it('matches config.agent.remove affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'config-agent-remove',
      async (projectRoot) => {
        await applyInteractiveAgentRemove({
          projectRoot,
          agents: ['codex'],
          confirmRemoval: () => true,
        });
      },
      ['config', 'agent', 'remove', 'codex'],
    );
  });

  it('matches workflow.state.write affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'workflow-state-write',
      async (projectRoot) => {
        await applyInteractiveWorkflowStateWrite({
          projectRoot,
          state: {
            taskSpecId: '001',
            slug: 'active-checkout',
            workflowVariantId: 'quick',
            lastCompletedStepId: 'implement',
            currentStepId: null,
            status: 'complete',
          },
          confirmOverwrite: () => true,
        });
      },
      [
        'workflow',
        'state',
        'write',
        '--task-spec-id',
        '001',
        '--workflow-variant-id',
        'quick',
        '--last-completed-step-id',
        'implement',
        '--status',
        'complete',
      ],
      true,
    );
  });
});

describe('interactive CLI parity for User Story 3', () => {
  it('matches init affected files byte-for-byte', async () => {
    const interactiveRoot = await createEmptyProject('init-interactive');
    const cliRoot = await createEmptyProject('init-cli');

    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
    try {
      await applyInteractiveInit({ projectRoot: interactiveRoot, agents: ['codex'] });
    } finally {
      vi.useRealTimers();
    }

    const dateShimUrl = await writeDateShim(cliRoot);
    runCli(cliRoot, ['init', '.', '--agents', 'codex'], dateShimUrl);
    await fse.remove(path.join(cliRoot, '.tmp-fixed-date.mjs'));

    expect(await snapshotTextFiles(interactiveRoot)).toEqual(await snapshotTextFiles(cliRoot));
  }, 15_000);

  it('matches update affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'update',
      async (projectRoot) => {
        await applyInteractiveUpdate({
          projectRoot,
          confirmUpdate: () => true,
        });
      },
      ['update', '--force'],
      true,
    );
  }, 60_000);

  it('matches step.instantiate affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'step-instantiate',
      async (projectRoot) => {
        await applyInteractiveStepInstantiate({
          projectRoot,
          taskSpec: ACTIVE_TASK_SPEC,
          stepId: 'plan',
        });
      },
      ['step', 'instantiate', '--task-spec-id', '001', '--step-id', 'plan'],
    );
  });

  it('matches spec.frontmatter.update affected files byte-for-byte', async () => {
    await expectInteractiveCliParity(
      'spec-frontmatter-update',
      async (projectRoot) => {
        await applyInteractiveSpecFrontmatterUpdate({
          projectRoot,
          taskSpec: ACTIVE_TASK_SPEC,
          fields: { owner: 'interactive' },
        });
      },
      ['spec', 'frontmatter', 'update', '--task-spec-id', '001', '--field', 'owner=interactive'],
    );
  });
});
