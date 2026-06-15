import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runInit } from '../../src/sdk/init.js';
import { runProjectRemove } from '../../src/sdk/remove.js';
import { runUpdate } from '../../src/sdk/update.js';
import { LOCAL_INSTALL_LAYOUT_VERSION } from '../../src/sdk/install/local-install-integrity.js';

const tempDirs: string[] = [];
const repoRoot = path.resolve('.');
const dispatcherPath = path.join(repoRoot, 'dist/cli/dispatcher.js');
const fixtureVersionA = path.join(repoRoot, 'tests/fixtures/local-bundle-version-a');
const fixtureVersionB = path.join(repoRoot, 'tests/fixtures/local-bundle-version-b');

/**
 * Creates a temporary project directory tracked for cleanup.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-bundle-upgrade-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Runs the global dispatcher with arguments from a project root.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the dispatcher script path.
 * @returns Spawn result with stdout and stderr captured.
 */
function runDispatcher(
  projectRoot: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [dispatcherPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
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
  if (!existsSync(dispatcherPath)) {
    throw new Error('Build output missing. Run `npm run build` before integration tests.');
  }
  for (const fixtureRoot of [fixtureVersionA, fixtureVersionB]) {
    if (!existsSync(path.join(fixtureRoot, 'dist/local-bundle/cli/index.js'))) {
      throw new Error(`Fixture bundle missing under ${fixtureRoot}.`);
    }
  }
});

describe('local bundle upgrade (quickstart scenario 4, SC-006)', () => {
  it('replaces dist bundle and updates pinned version from A to B', async () => {
    const projectRoot = createTempProject('upgrade');
    const workflowConfigPath = path.join(
      projectRoot,
      '.spec-n-roll',
      'config',
      'workflow.config.json',
    );

    await runInit({
      projectRoot,
      agents: ['cursor'],
      toolkitRoot: fixtureVersionA,
    });

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    const manifestBefore = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
    };
    expect(manifestBefore.toolkitVersion).toBe('0.9.0-a');
    expect(manifestBefore.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);

    const versionBefore = runDispatcher(projectRoot, ['version']);
    expect(versionBefore.status).toBe(0);
    expect(versionBefore.stdout).toContain('toolkit version: 0.9.0-a');

    const workflowBefore = readFileSync(workflowConfigPath, 'utf8');

    const dryRun = await runUpdate({
      projectRoot,
      toolkitRoot: fixtureVersionB,
      dryRun: true,
    });
    expect(dryRun.previousToolkitVersion).toBe('0.9.0-a');
    expect(dryRun.targetToolkitVersion).toBe('0.9.0-b');
    expect(dryRun.overwrittenFiles).toContain('.spec-n-roll/cli/dist');

    await runUpdate({
      projectRoot,
      toolkitRoot: fixtureVersionB,
    });

    const manifestAfter = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
      toolkitPackageRoot?: string;
    };
    expect(manifestAfter.toolkitVersion).toBe('0.9.0-b');
    expect(manifestAfter.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(manifestAfter.toolkitPackageRoot).toBeUndefined();
    expect(readFileSync(path.join(cliDir, 'package.json'), 'utf8')).toContain(
      '"version": "0.9.0-b"',
    );
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'mcp', 'server.js'))).toBe(true);

    const versionAfter = runDispatcher(projectRoot, ['version']);
    expect(versionAfter.status).toBe(0);
    expect(versionAfter.stdout).toContain('toolkit version: 0.9.0-b');
    expect(versionAfter.stdout).not.toContain('0.9.0-a');

    const helpResult = runDispatcher(projectRoot, ['init', '--help']);
    expect(helpResult.status).toBe(0);
    expect(helpResult.stdout).toContain('Initialize Spec-N-Roll');

    const workflowAfter = readFileSync(workflowConfigPath, 'utf8');
    expect(workflowAfter).not.toBe(workflowBefore);
    expect(workflowAfter).toContain('"toolkitVersion": "0.9.0-b"');
  }, 30_000);

  it('removes self-contained cli runtime including dist on project remove', async () => {
    const projectRoot = createTempProject('remove');
    await runInit({
      projectRoot,
      agents: ['cursor'],
      toolkitRoot: fixtureVersionA,
    });

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(true);

    const result = await runProjectRemove({
      projectRoot,
      skipConfirmation: true,
    });

    expect(result.removedPaths).toContain('.spec-n-roll');
    expect(existsSync(cliDir)).toBe(false);
    expect(existsSync(path.join(projectRoot, '.spec-n-roll'))).toBe(false);
  }, 30_000);
});
