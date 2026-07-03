import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LOCAL_CLI_RELATIVE_PATH,
  type LocalCliLookupResult,
  findLocalCli,
  findLocalCliOrThrow,
  buildDelegatedCliEnv,
  parseDispatcherArgs,
  runLocal,
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

/**
 * Reads the local CLI fixture and fails loudly if fixture creation did not produce it.
 *
 * @param projectRoot - Absolute path to the test project root.
 * @returns Discovered local CLI details for the project.
 */
function readRequiredLocalCli(projectRoot: string): LocalCliLookupResult {
  const localCli = findLocalCliOrThrow(projectRoot);
  if (localCli == null) {
    throw new Error(`Expected local CLI fixture under ${projectRoot}.`);
  }
  return localCli;
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

describe('parseDispatcherArgs', () => {
  it('removes --global and reports forceGlobal', () => {
    expect(parseDispatcherArgs(['init', '--global', '.'])).toEqual({
      forceGlobal: true,
      args: ['init', '.'],
    });
  });

  it('leaves args unchanged when --global is absent', () => {
    expect(parseDispatcherArgs(['version'])).toEqual({
      forceGlobal: false,
      args: ['version'],
    });
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
      cliPath,
    });
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

describe('buildDelegatedCliEnv', () => {
  it('passes dispatcher install source metadata to delegated local CLIs', () => {
    const env = buildDelegatedCliEnv({ PATH: 'fixture-path' });

    expect(env.SPEC_N_ROLL_DISPATCHED).toBe('1');
    expect(['local', 'remote']).toContain(env.SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE);
    expect(env.SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY).toBeTruthy();
    expect(env.SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT).toBeTruthy();
    if (env.SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE === 'local') {
      expect(env.SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH).toBeTruthy();
    }
  });
});

describe('runLocal', () => {
  it('returns integrity error when local CLI exists without a valid bundled install', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('resolve-delegate');
    writeLocalCli(root);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(runLocal(readRequiredLocalCli(root), false, ['version'], { cwd: root })).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/incomplete/i));
    error.mockRestore();
  });

  it('reports an error when local CLI is not executable', () => {
    if (process.platform === 'win32') {
      return;
    }

    const root = createTempDir('resolve-error');
    writeLocalCli(root, false);

    expect(() => findLocalCliOrThrow(root)).toThrow(/not executable/);
  });
});
