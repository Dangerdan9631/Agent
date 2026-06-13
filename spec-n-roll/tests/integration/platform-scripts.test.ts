import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runInit } from '../../src/cli/commands/init.js';
import { runAutomationScript } from '../../src/workflow/engine.js';
import {
  BUNDLED_SCRIPT_BASE_NAMES,
  PlatformScriptError,
  executePlatformScript,
} from '../../src/workflow/platform-scripts.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for platform script integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-platform-int-${prefix}-${Date.now()}`);
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

describe('platform script integration', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('installs paired .sh and .ps1 scripts during init', async () => {
    const projectRoot = createTempProject('init-scripts');
    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const scriptsDir = path.join(projectRoot, '.spec-n-roll', 'scripts');
    for (const scriptBaseName of BUNDLED_SCRIPT_BASE_NAMES) {
      const shPath = path.join(scriptsDir, `${scriptBaseName}.sh`);
      const ps1Path = path.join(scriptsDir, `${scriptBaseName}.ps1`);
      expect(existsSync(shPath)).toBe(true);
      expect(existsSync(ps1Path)).toBe(true);
      expect(readFileSync(shPath, 'utf8').length).toBeGreaterThan(0);
      expect(readFileSync(ps1Path, 'utf8').length).toBeGreaterThan(0);
    }
  });

  it('selects the .ps1 script on a windows fixture', async () => {
    const projectRoot = createTempProject('windows-fixture');
    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const spawned: string[] = [];
    const result = await runAutomationScript({
      projectRoot,
      scriptBaseName: 'check-prerequisites',
      deps: {
        platform: 'win32',
        commandExists: () => true,
        bashPathExists: () => true,
        spawn: (_command, args) => {
          spawned.push(args.join(' '));
          return { status: 0, stdout: 'windows\n', stderr: '' };
        },
      },
    });

    expect(result.stdout.trim()).toBe('windows');
    expect(spawned.some((line) => line.includes('check-prerequisites.ps1'))).toBe(true);
    expect(spawned.some((line) => line.includes('check-prerequisites.sh'))).toBe(false);
  });

  it('selects the .sh script on a unix fixture', async () => {
    const projectRoot = createTempProject('unix-fixture');
    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const spawned: string[] = [];
    const result = await runAutomationScript({
      projectRoot,
      scriptBaseName: 'check-prerequisites',
      deps: {
        platform: 'darwin',
        commandExists: () => true,
        bashPathExists: () => true,
        spawn: (command, args) => {
          spawned.push([command, ...args].join(' '));
          return { status: 0, stdout: 'unix\n', stderr: '' };
        },
      },
    });

    expect(result.stdout.trim()).toBe('unix');
    expect(spawned.some((line) => line.includes('check-prerequisites.sh'))).toBe(true);
    expect(spawned.some((line) => line.includes('check-prerequisites.ps1'))).toBe(false);
  });

  it('fails with a clear remediation when the shell runtime is missing', async () => {
    const projectRoot = createTempProject('missing-runtime');
    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    await expect(
      executePlatformScript({
        projectRoot,
        scriptBaseName: 'check-prerequisites',
        deps: {
          platform: 'linux',
          commandExists: () => false,
          bashPathExists: () => false,
          spawn: () => ({ status: 0, stdout: '', stderr: '' }),
        },
      }),
    ).rejects.toBeInstanceOf(PlatformScriptError);

    try {
      await executePlatformScript({
        projectRoot,
        scriptBaseName: 'check-prerequisites',
        deps: {
          platform: 'linux',
          commandExists: () => false,
          bashPathExists: () => false,
          spawn: () => ({ status: 0, stdout: '', stderr: '' }),
        },
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'SHELL_RUNTIME_MISSING',
        remediation: expect.stringMatching(/bash/i),
      });
      expect((error as Error).message).toMatch(/bash/i);
    }
  });
});
