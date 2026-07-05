import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { installProjectBinaries } from '../../src/sdk/install/local-binaries.js';
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
  const dir = path.join(os.tmpdir(), `spec-n-roll-multi-version-${prefix}-${Date.now()}`);
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

describe('local bundle multi-version isolation (SC-001, SC-003)', () => {
  it('pins distinct toolkit versions per project without cross-project coupling', async () => {
    const projectA = createTempProject('project-a');
    const projectB = createTempProject('project-b');

    await installProjectBinaries(projectA, fixtureVersionA);
    await installProjectBinaries(projectB, fixtureVersionB);

    const cliDirA = path.join(projectA, '.spec-n-roll', 'cli');
    const cliDirB = path.join(projectB, '.spec-n-roll', 'cli');

    const manifestA = JSON.parse(readFileSync(path.join(cliDirA, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
      toolkitPackageRoot?: string;
    };
    const manifestB = JSON.parse(readFileSync(path.join(cliDirB, 'install.json'), 'utf8')) as {
      toolkitVersion: string;
      layoutVersion: number;
      toolkitPackageRoot?: string;
    };

    expect(manifestA.toolkitVersion).toBe('0.9.0-a');
    expect(manifestB.toolkitVersion).toBe('0.9.0-b');
    expect(manifestA.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(manifestB.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(manifestA.toolkitPackageRoot).toBeUndefined();
    expect(manifestB.toolkitPackageRoot).toBeUndefined();

    const versionA = runDispatcher(projectA, ['version']);
    const versionB = runDispatcher(projectB, ['version']);

    expect(versionA.status).toBe(0);
    expect(versionB.status).toBe(0);
    expect(versionA.stdout).toContain('toolkit version: 0.9.0-a');
    expect(versionB.stdout).toContain('toolkit version: 0.9.0-b');
    expect(versionA.stdout).toContain('invocation: local');
    expect(versionB.stdout).toContain('invocation: local');
    expect(versionA.stdout).not.toContain('0.9.0-b');
    expect(versionB.stdout).not.toContain('0.9.0-a');
  }, 30_000);
});
