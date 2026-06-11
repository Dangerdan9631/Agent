import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PlatformScriptError,
  checkShellRuntime,
  detectPlatformKind,
  executePlatformScript,
  resolveProjectScriptPath,
  selectScriptExtension,
} from '../../src/workflow/platform-scripts.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory for platform script unit tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-platform-${prefix}-${Date.now()}`);
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

describe('detectPlatformKind', () => {
  it('maps win32 to windows', () => {
    expect(detectPlatformKind('win32')).toBe('windows');
  });

  it('maps darwin and linux to unix', () => {
    expect(detectPlatformKind('darwin')).toBe('unix');
    expect(detectPlatformKind('linux')).toBe('unix');
  });
});

describe('selectScriptExtension', () => {
  it('selects .ps1 on windows and .sh on unix', () => {
    expect(selectScriptExtension('windows')).toBe('.ps1');
    expect(selectScriptExtension('unix')).toBe('.sh');
  });
});

describe('resolveProjectScriptPath', () => {
  it('resolves platform-specific script paths under .spec-n-roll/scripts/', () => {
    const projectRoot = '/project';
    expect(resolveProjectScriptPath(projectRoot, 'check-prerequisites', 'windows')).toBe(
      path.join(projectRoot, '.spec-n-roll', 'scripts', 'check-prerequisites.ps1'),
    );
    expect(resolveProjectScriptPath(projectRoot, 'check-prerequisites', 'unix')).toBe(
      path.join(projectRoot, '.spec-n-roll', 'scripts', 'check-prerequisites.sh'),
    );
  });
});

describe('checkShellRuntime', () => {
  it('reports missing PowerShell on windows with remediation', () => {
    const result = checkShellRuntime('windows', { commandExists: () => false });
    expect(result.available).toBe(false);
    expect(result.remediation).toMatch(/PowerShell/i);
  });

  it('reports missing bash on unix with remediation', () => {
    const result = checkShellRuntime('unix', {
      commandExists: () => false,
      bashPathExists: () => false,
    });
    expect(result.available).toBe(false);
    expect(result.remediation).toMatch(/bash/i);
  });

  it('accepts pwsh or powershell on windows', () => {
    const result = checkShellRuntime('windows', {
      commandExists: (cmd) => cmd === 'pwsh' || cmd === 'powershell',
    });
    expect(result.available).toBe(true);
  });

  it('accepts bash on PATH or /bin/bash on unix', () => {
    const result = checkShellRuntime('unix', {
      commandExists: () => false,
      bashPathExists: () => true,
    });
    expect(result.available).toBe(true);
  });
});

describe('executePlatformScript', () => {
  it('invokes the .ps1 script on windows and never the .sh variant', async () => {
    const projectRoot = createTempDir('win-exec');
    const scriptsDir = path.join(projectRoot, '.spec-n-roll', 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    const ps1Path = path.join(scriptsDir, 'check-prerequisites.ps1');
    const shPath = path.join(scriptsDir, 'check-prerequisites.sh');
    writeFileSync(ps1Path, 'Write-Output "windows-script"\n', 'utf8');
    writeFileSync(shPath, '#!/usr/bin/env bash\necho unix-script\n', 'utf8');

    const spawned: { command: string; args: string[] }[] = [];
    const result = await executePlatformScript({
      projectRoot,
      scriptBaseName: 'check-prerequisites',
      deps: {
        platform: 'win32',
        commandExists: () => true,
        bashPathExists: () => true,
        spawn: (command, args) => {
          spawned.push({ command, args: [...args] });
          return {
            status: 0,
            stdout: 'windows-script\n',
            stderr: '',
          };
        },
      },
    });

    expect(result.stdout.trim()).toBe('windows-script');
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.args.some((arg) => arg.endsWith('check-prerequisites.ps1'))).toBe(true);
    expect(spawned[0]?.args.some((arg) => arg.endsWith('check-prerequisites.sh'))).toBe(false);
  });

  it('invokes the .sh script on unix and never the .ps1 variant', async () => {
    const projectRoot = createTempDir('unix-exec');
    const scriptsDir = path.join(projectRoot, '.spec-n-roll', 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    const ps1Path = path.join(scriptsDir, 'check-prerequisites.ps1');
    const shPath = path.join(scriptsDir, 'check-prerequisites.sh');
    writeFileSync(ps1Path, 'Write-Output "windows-script"\n', 'utf8');
    writeFileSync(shPath, '#!/usr/bin/env bash\necho unix-script\n', 'utf8');

    const spawned: { command: string; args: string[] }[] = [];
    const result = await executePlatformScript({
      projectRoot,
      scriptBaseName: 'check-prerequisites',
      deps: {
        platform: 'linux',
        commandExists: () => true,
        bashPathExists: () => true,
        spawn: (command, args) => {
          spawned.push({ command, args: [...args] });
          return {
            status: 0,
            stdout: 'unix-script\n',
            stderr: '',
          };
        },
      },
    });

    expect(result.stdout.trim()).toBe('unix-script');
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.command).toBe('/bin/bash');
    expect(spawned[0]?.args.some((arg) => arg.endsWith('check-prerequisites.sh'))).toBe(true);
    expect(spawned[0]?.args.some((arg) => arg.endsWith('check-prerequisites.ps1'))).toBe(false);
  });

  it('fails with remediation when the required shell runtime is missing', async () => {
    const projectRoot = createTempDir('missing-runtime');
    const scriptsDir = path.join(projectRoot, '.spec-n-roll', 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(path.join(scriptsDir, 'check-prerequisites.ps1'), 'exit 0\n', 'utf8');

    await expect(
      executePlatformScript({
        projectRoot,
        scriptBaseName: 'check-prerequisites',
        deps: {
          platform: 'win32',
          commandExists: () => false,
          bashPathExists: () => false,
          spawn: () => ({ status: 0, stdout: '', stderr: '' }),
        },
      }),
    ).rejects.toMatchObject({
      name: 'PlatformScriptError',
      code: 'SHELL_RUNTIME_MISSING',
      remediation: expect.stringMatching(/PowerShell/i),
    } satisfies Partial<PlatformScriptError>);
  });
});
