import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

import { spawnSync } from 'node:child_process';
import { Dispatcher } from '../../src/dispatcher/dispatcher.js';
import { LOCAL_CLI_RELATIVE_PATH } from '../../src/dispatcher/location.js';

const tempDirs: string[] = [];
const tempFiles: string[] = [];
const mockedSpawnSync = vi.mocked(spawnSync);

/**
 * Creates a temporary project directory tracked for cleanup after each test.
 *
 * @param prefix - Unique directory prefix for the test fixture.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-${prefix}-${Date.now()}-${Math.random()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a local CLI launcher in the project-local install location.
 *
 * @param projectRoot - Absolute project root receiving the launcher.
 * @returns Absolute path to the local CLI launcher.
 */
function writeLocalCli(projectRoot: string): string {
  const cliPath = path.join(projectRoot, LOCAL_CLI_RELATIVE_PATH);
  mkdirSync(path.dirname(cliPath), { recursive: true });
  writeFileSync(cliPath, '#!/usr/bin/env node\nprocess.exit(42);\n', 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(cliPath, 0o755);
  }

  return cliPath;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempFiles.length > 0) {
    const file = tempFiles.pop();
    if (file != null) {
      rmSync(file, { force: true });
    }
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Dispatcher', () => {
  it('delegates to a project-local CLI and removes dispatcher-only root flags', async () => {
    mockedSpawnSync.mockReturnValue({
      status: 42,
      signal: null,
      output: [],
      pid: 1,
      stdout: null,
      stderr: null,
    });
    const projectRoot = createTempDir('local');
    const cliPath = writeLocalCli(projectRoot);

    expect(new Dispatcher().run(['--root', projectRoot, 'version'])).toBe(42);

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      [cliPath, 'version'],
      expect.objectContaining({
        cwd: projectRoot,
        env: expect.objectContaining({
          SPEC_N_ROLL_DISPATCHED: '1',
          SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: expect.any(String),
          SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT: expect.any(String),
        }) as NodeJS.ProcessEnv,
        stdio: 'inherit',
      }),
    );
  });

  it('forwards unknown CLI options after removing dispatcher-only flags', async () => {
    mockedSpawnSync.mockReturnValue({
      status: 42,
      signal: null,
      output: [],
      pid: 1,
      stdout: null,
      stderr: null,
    });
    const projectRoot = createTempDir('forwarded-options');
    const cliPath = writeLocalCli(projectRoot);

    expect(
      new Dispatcher().run(['--root', projectRoot, 'version', '--help', '--format', 'json']),
    ).toBe(42);

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      [cliPath, 'version', '--help', '--format', 'json'],
      expect.objectContaining({
        cwd: projectRoot,
        stdio: 'inherit',
      }),
    );
  });

  it('uses global routing when forced even if a local project exists', async () => {
    mockedSpawnSync.mockReturnValue({
      status: 0,
      signal: null,
      output: [],
      pid: 1,
      stdout: null,
      stderr: null,
    });
    const projectRoot = createTempDir('global');
    const globalEntrypoint = path.resolve('src', 'dispatcher', 'index.js');
    writeFileSync(globalEntrypoint, '#!/usr/bin/env node\nprocess.exit(0);\n', 'utf8');
    tempFiles.push(globalEntrypoint);
    if (process.platform !== 'win32') {
      chmodSync(globalEntrypoint, 0o755);
    }
    writeLocalCli(projectRoot);

    expect(new Dispatcher().run(['--root', projectRoot, '--global', 'version'])).toBe(0);

    const [, args, options] = mockedSpawnSync.mock.calls.at(-1) ?? [];
    expect(args).toEqual([expect.stringMatching(/[\\/]index\.js$/), 'version']);
    expect(options).toEqual(
      expect.objectContaining({
        env: expect.objectContaining({
          SPEC_N_ROLL_DISPATCHED: '1',
          SPEC_N_ROLL_DISPATCHER_VERSION: expect.any(String),
        }) as NodeJS.ProcessEnv,
      }),
    );
  });
});
