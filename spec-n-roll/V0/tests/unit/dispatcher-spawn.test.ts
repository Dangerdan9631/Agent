import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

import { spawnSync } from 'node:child_process';
import { spawnNode } from '../../src/dispatcher/process.js';

const tempDirs: string[] = [];
const mockedSpawnSync = vi.mocked(spawnSync);

/**
 * Creates an executable JavaScript fixture used to verify spawn arguments.
 *
 * @returns Absolute path to the executable fixture.
 */
function createExecutableFixture(): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-spawn-${Date.now()}-${Math.random()}`);
  tempDirs.push(dir);
  mkdirSync(dir, { recursive: true });
  const scriptPath = path.join(dir, 'cli.js');
  writeFileSync(scriptPath, '#!/usr/bin/env node\nprocess.exit(0);\n', 'utf8');
  if (process.platform !== 'win32') {
    chmodSync(scriptPath, 0o755);
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

describe('dispatcher spawn behavior', () => {
  it('spawns node without shell interpolation for spaced exec paths', async () => {
    mockedSpawnSync.mockReturnValue({
      status: 0,
      signal: null,
      output: [],
      pid: 1,
      stdout: null,
      stderr: null,
    });
    const execPath = 'C:\\Program Files\\nodejs\\node.exe';
    const originalExecPath = process.execPath;
    const scriptPath = createExecutableFixture();

    Object.defineProperty(process, 'execPath', {
      configurable: true,
      value: execPath,
    });

    try {
      spawnNode(scriptPath, [], {}, 'test CLI');
    } finally {
      Object.defineProperty(process, 'execPath', {
        configurable: true,
        value: originalExecPath,
      });
    }

    expect(mockedSpawnSync).toHaveBeenCalled();
    const [command, args, options] = mockedSpawnSync.mock.calls.at(-1) ?? [];
    expect(command).toBe(execPath);
    expect(args?.[0]).toBe(scriptPath);
    expect(options?.shell).toBeUndefined();
  });
});
