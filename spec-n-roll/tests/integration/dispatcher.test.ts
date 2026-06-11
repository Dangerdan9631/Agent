import { existsSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { buildDelegatedCliEnv } from '../../src/cli/dispatcher.js';
import { runInit } from '../../src/cli/commands/init.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for dispatcher integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-dispatcher-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
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

describe('global dispatcher local exec', () => {
  const dispatcherPath = path.resolve('dist/cli/dispatcher.js');
  const fullCliPath = path.resolve('dist/cli/index.js');

  beforeAll(() => {
    if (!existsSync(dispatcherPath) || !existsSync(fullCliPath)) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it("exec's the local full CLI without in-process load and forwards -v to combined version report", async () => {
    const projectRoot = createTempProject('delegate');
    await runInit({
      projectRoot,
      agents: ['cursor'],
      yes: true,
    });

    const delegated = spawnSync(process.execPath, [dispatcherPath, '-v'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(delegated.status).toBe(0);
    expect(delegated.stdout).toContain('toolkit version');
    expect(delegated.stdout).toContain('local');

    const localCliPath = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll');
    const normalizedOutput = delegated.stdout.replace(/\\/g, '/');
    expect(normalizedOutput).toContain(localCliPath.replace(/\\/g, '/'));

    const directLocal = spawnSync(process.execPath, [localCliPath, 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: buildDelegatedCliEnv(process.env),
    });
    expect(directLocal.status).toBe(0);
    expect(directLocal.stdout).toContain('toolkit version');
  });

  it('bypasses local delegation when --global is present', () => {
    const projectRoot = createTempProject('global-bypass');
    const globalVersion = spawnSync(process.execPath, [dispatcherPath, '--global', 'version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(globalVersion.status).toBe(0);
    expect(globalVersion.stdout).toContain('toolkit version');
    expect(globalVersion.stdout).not.toContain('.spec-n-roll/cli/bin/spec-n-roll');
  });
});
