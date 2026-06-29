import { spawnSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

/**
 * Mocked synchronous spawn function used to inspect reload command construction.
 */
const mockedSpawnSync = vi.mocked(spawnSync);

describe('reloadInteractiveApp', () => {
  beforeEach(() => {
    mockedSpawnSync.mockClear();
  });

  it('restarts through an explicit command when provided', async () => {
    const { reloadInteractiveApp } = await import('../../../src/ink/reload.js');

    const exitCode = reloadInteractiveApp({
      cwd: 'C:/project',
      command: 'spec-n-roll',
      argv: ['--global'],
    });

    expect(exitCode).toBe(0);
    expect(mockedSpawnSync).toHaveBeenCalledWith('spec-n-roll', ['--global'], {
      cwd: 'C:/project',
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    });
  });

  it('falls back to the current Node entrypoint when no command is provided', async () => {
    const { reloadInteractiveApp } = await import('../../../src/ink/reload.js');

    const exitCode = reloadInteractiveApp({
      cwd: 'C:/project',
      executedBinaryPath: 'C:/cli/index.js',
      argv: [],
    });

    expect(exitCode).toBe(0);
    expect(mockedSpawnSync).toHaveBeenCalledWith(process.execPath, ['C:/cli/index.js'], {
      cwd: 'C:/project',
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    });
  });
});
