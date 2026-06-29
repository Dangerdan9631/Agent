import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  LOCAL_CLI_RELATIVE_PATH,
  findLocalCli,
  findLocalCliOrThrow,
  buildDelegatedCliEnv,
  isExecutable,
  readDispatcherInstallSourceKind,
  resolveDelegation,
  resolveLocalCliPath,
  selectDispatchRuntimeMode,
  shouldDelegateToLocal,
  stripGlobalFlag,
} from '../../src/dispatcher/index.js';

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-${prefix}-${Date.now()}-${Math.random()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

function writeLocalCli(projectRoot: string, executable = true): string {
  const cliDir = path.join(projectRoot, path.dirname(LOCAL_CLI_RELATIVE_PATH));
  mkdirSync(cliDir, { recursive: true });
  const cliPath = path.join(projectRoot, LOCAL_CLI_RELATIVE_PATH);
  writeFileSync(cliPath, '#!/usr/bin/env node\nprocess.exit(42);\n', 'utf8');

  if (executable && process.platform !== 'win32') {
    chmodSync(cliPath, 0o755);
  } else if (!executable && process.platform !== 'win32') {
    chmodSync(cliPath, 0o644);
  }

  return cliPath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup for temp fixture dirs.
      }
    }
  }
});

describe('stripGlobalFlag', () => {
  it('removes --global and reports forceGlobal', () => {
    expect(stripGlobalFlag(['init', '--global', '.'])).toEqual({
      forceGlobal: true,
      args: ['init', '.'],
    });
  });

  it('leaves args unchanged when --global is absent', () => {
    expect(stripGlobalFlag(['version'])).toEqual({
      forceGlobal: false,
      args: ['version'],
    });
  });
});

describe('selectDispatchRuntimeMode', () => {
  it('selects interactive mode for bare invocation', () => {
    expect(selectDispatchRuntimeMode([])).toBe('interactive');
  });

  it('selects non-interactive mode when command arguments are present', () => {
    expect(selectDispatchRuntimeMode(['version'])).toBe('non-interactive');
  });
});

describe('findLocalCli', () => {
  it('walks parent directories until a local CLI is found', () => {
    const root = createTempDir('walk');
    const nested = path.join(root, 'apps', 'service');
    mkdirSync(nested, { recursive: true });
    const cliPath = writeLocalCli(root);

    const result = findLocalCli(nested);
    expect(result).toEqual({
      projectRoot: root,
      cliPath: resolveLocalCliPath(root),
    });
    expect(result?.cliPath).toBe(cliPath);
  });

  it('returns null when no local CLI exists', () => {
    const root = createTempDir('missing');
    expect(findLocalCli(root)).toBeNull();
  });

  it('returns null when local CLI exists but is not executable', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('unexec-find');
    writeLocalCli(root, false);
    expect(findLocalCli(root)).toBeNull();
  });
});

describe('findLocalCliOrThrow', () => {
  it('throws when local CLI exists but is not executable', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('unexec-throw');
    writeLocalCli(root, false);

    expect(() => findLocalCliOrThrow(root)).toThrow(/not executable/);
  });
});

describe('shouldDelegateToLocal', () => {
  it('delegates when a local CLI is available and --global is absent', () => {
    const root = createTempDir('delegate');
    writeLocalCli(root);
    const localCli = findLocalCli(root);

    expect(shouldDelegateToLocal(['version'], localCli)).toBe(true);
    expect(shouldDelegateToLocal(['--global', 'version'], localCli)).toBe(false);
  });
});

describe('buildDelegatedCliEnv', () => {
  it('passes dispatcher install source metadata to delegated local CLIs', () => {
    const env = buildDelegatedCliEnv({ PATH: 'fixture-path' });

    expect(env.SPEC_N_ROLL_DISPATCHED).toBe('1');
    expect(env.SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE).toBe(readDispatcherInstallSourceKind());
    expect(env.SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY).toBeTruthy();
    expect(env.SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT).toBeTruthy();
    if (readDispatcherInstallSourceKind() === 'local') {
      expect(env.SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH).toBeTruthy();
    }
  });
});

describe('resolveDelegation', () => {
  it('returns integrity error when local CLI exists without a valid bundled install', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('resolve-delegate');
    writeLocalCli(root);

    const result = resolveDelegation(['version'], { cwd: root });
    expect(result.action).toBe('error');
    if (result.action === 'error') {
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/incomplete/i);
    }
  });

  it('continues when --global is set', () => {
    const root = createTempDir('resolve-global');
    writeLocalCli(root);

    const result = resolveDelegation(['--global', 'version'], { cwd: root });
    expect(result).toEqual({ action: 'continue' });
  });

  it('reports an error when local CLI is not executable', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('resolve-error');
    writeLocalCli(root, false);

    const result = resolveDelegation(['version'], { cwd: root });
    expect(result.action).toBe('error');
    if (result.action === 'error') {
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/not executable/);
    }
  });
});

describe('isExecutable', () => {
  it('returns true for an executable local CLI script', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('is-exec');
    const cliPath = writeLocalCli(root, true);
    expect(isExecutable(cliPath)).toBe(true);
  });
});
