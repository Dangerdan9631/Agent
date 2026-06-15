import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import fse from 'fs-extra';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  REPOSITORY_WORKFLOW_TYPE_IDS,
  REPOSITORY_WORKFLOW_TYPES,
  checkRepositoryWorkflowInitialization,
  listRepositoryWorkflowTypes,
} from '../../src/sdk/repository/workflow-run.js';
import { copyRepositoryWorkflowFixture } from '../helpers/repository-workflows.js';

const tempRoots: string[] = [];
const cliPath = path.resolve('dist/cli/index.js');

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fse.remove(root)));
});

/**
 * Creates a temporary project root for repository workflow contract tests.
 *
 * @returns Absolute path to the temporary project root.
 */
async function createTempProjectRoot(): Promise<string> {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-repo-workflow-contract-${Date.now()}`);
  tempRoots.push(projectRoot);
  await fse.ensureDir(projectRoot);
  return projectRoot;
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

/**
 * Runs a CLI subcommand expecting a non-zero exit code.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the script path.
 * @returns Child process result with stderr text.
 */
function runCliExpectFailure(projectRoot: string, args: string[]) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.status).not.toBe(0);
  return result;
}

describe('repository workflows contract', () => {
  beforeAll(() => {
    if (!fse.existsSync(cliPath)) {
      throw new Error('Build output missing. Run `npm run build` before contract tests.');
    }
  });

  it('requires initialized scaffolding before repository workflows can start', async () => {
    const projectRoot = await createTempProjectRoot();

    const check = await checkRepositoryWorkflowInitialization(projectRoot);
    expect(check.initialized).toBe(false);
    expect(check.blockingMessage).toMatch(/spec-n-roll init/i);

    const failure = runCliExpectFailure(projectRoot, [
      'repository-workflow',
      'start',
      '--workflow-type-id',
      'repository-onboarding',
    ]);
    expect(failure.stderr).toMatch(/spec-n-roll init/i);

    await expect(fse.pathExists(path.join(projectRoot, 'specs'))).resolves.toBe(false);
    await expect(fse.pathExists(path.join(projectRoot, 'living-specs'))).resolves.toBe(false);
  });

  it('lists repository onboarding and drift workflow types with metadata', async () => {
    const types = listRepositoryWorkflowTypes();

    expect(types.map((entry) => entry.id)).toEqual([...REPOSITORY_WORKFLOW_TYPE_IDS]);
    expect(types).toEqual(REPOSITORY_WORKFLOW_TYPES);

    const onboarding = types.find((entry) => entry.id === 'repository-onboarding');
    expect(onboarding?.requiresLivingSpecs).toBe('absent-or-partial');
    expect(onboarding?.specifyInjectionTemplate.sections).toContain(
      'Repository Discovery Evidence',
    );

    const projectRoot = await createTempProjectRoot();
    await fse.copy(
      path.resolve('tests/fixtures/repository-workflows/onboarding-basic/.spec-n-roll'),
      path.join(projectRoot, '.spec-n-roll'),
    );

    const cliResult = runCliJson(projectRoot, ['repository-workflow', 'types', 'list']) as {
      workflowTypes: Array<{ id: string }>;
    };
    expect(cliResult.workflowTypes.map((entry) => entry.id)).toEqual([
      'repository-onboarding',
      'repository-drift',
    ]);
  });

  it('returns blocker responses without partial artifact writes when drift prerequisites are missing', async () => {
    const projectRoot = await copyRepositoryWorkflowFixture('onboarding-basic', 'drift-blocker');
    tempRoots.push(projectRoot);

    const result = spawnSync(process.execPath, [cliPath, 'repository-workflow', 'drift', 'run'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout) as {
      status: string;
      blocker?: { code: string; message: string; stoppingGuidance: string };
      nextSteps?: string[];
    };
    expect(payload.status).toBe('blocked');
    expect(payload.blocker?.code).toBe('MISSING_LIVING_SPECS');
    expect(payload.blocker?.stoppingGuidance).toMatch(/repository-onboarding/i);
    expect(payload.nextSteps).toEqual(
      expect.arrayContaining(['resolve-blocker', 'retry-workflow']),
    );

    await expect(fse.pathExists(path.join(projectRoot, 'specs'))).resolves.toBe(false);
    await expect(fse.pathExists(path.join(projectRoot, 'living-specs'))).resolves.toBe(false);
  });
});
