import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

import { spawnSync } from 'node:child_process';
import { spawnNode } from '../../../src/dispatcher/process.js';

const tempDirs: string[] = [];
const mockedSpawnSync = vi.mocked(spawnSync);

/**
 * Creates a temporary directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-dispatcher-process-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a JavaScript CLI entrypoint fixture.
 *
 * @param root - Directory receiving the entrypoint.
 * @param executable - Whether execute permission should be granted on non-Windows platforms.
 * @returns Absolute path to the entrypoint.
 */
function writeEntrypoint(root: string, executable: boolean): string {
  const scriptPath = path.join(root, 'cli.js');
  writeFileSync(scriptPath, '#!/usr/bin/env node\nprocess.exit(0);\n', 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(scriptPath, executable ? 0o755 : 0o644);
  }

  return scriptPath;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('spawnNode executable validation', () => {
  it('does not spawn a missing CLI entrypoint', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(spawnNode(path.join(createTempDir('missing'), 'missing.js'), [], {}, 'test CLI')).toBe(
      1,
    );

    expect(mockedSpawnSync).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Cannot execute test CLI'));
  });

  it('does not spawn a non-executable CLI entrypoint', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const scriptPath = writeEntrypoint(createTempDir('non-exec'), false);

    expect(spawnNode(scriptPath, [], {}, 'test CLI')).toBe(1);

    expect(mockedSpawnSync).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Cannot execute test CLI'));
  });

  it('spawns an executable CLI entrypoint', async () => {
    mockedSpawnSync.mockReturnValue({
      status: 7,
      signal: null,
      output: [],
      pid: 1,
      stdout: null,
      stderr: null,
    });
    const scriptPath = writeEntrypoint(createTempDir('exec'), true);

    expect(spawnNode(scriptPath, ['version'], { cwd: path.dirname(scriptPath) }, 'test CLI')).toBe(
      7,
    );

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      [scriptPath, 'version'],
      expect.objectContaining({
        cwd: path.dirname(scriptPath),
        stdio: 'inherit',
      }),
    );
  });
});
