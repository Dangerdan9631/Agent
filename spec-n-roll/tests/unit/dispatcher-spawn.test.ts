import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

import { spawnSync } from 'node:child_process';

const mockedSpawnSync = vi.mocked(spawnSync);

describe('dispatcher spawn behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    mockedSpawnSync.mockClear();
  });

  it('runGlobal spawns node without shell interpolation for spaced exec paths', async () => {
    const { runGlobal } = await import('../../src/dispatcher/index.js');
    const execPath = 'C:\\Program Files\\nodejs\\node.exe';
    const originalExecPath = process.execPath;

    Object.defineProperty(process, 'execPath', {
      configurable: true,
      value: execPath,
    });

    try {
      runGlobal(true, [], {});
    } finally {
      Object.defineProperty(process, 'execPath', {
        configurable: true,
        value: originalExecPath,
      });
    }

    expect(mockedSpawnSync).toHaveBeenCalled();
    const [command, args, options] = mockedSpawnSync.mock.calls.at(-1) ?? [];
    expect(command).toBe(execPath);
    expect(args?.[0]).toMatch(/ink[\\/]+index\.js$/);
    expect(options?.shell).toBeUndefined();
  });
});
