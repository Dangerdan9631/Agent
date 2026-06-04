import 'reflect-metadata';

import type { OvermindConfigOptions } from '@overmind-sdk/config';
import { describe, expect, it, vi } from 'vitest';

import { ShutdownOperation } from '../../src/operations/shutdown.js';

describe('ShutdownOperation', () => {
  it('returns the IPC response for cooperative shutdown', async () => {
    const ipcClient = {
      shutdown: vi.fn().mockResolvedValue({ message: 'Overmind service is shutting down.' }),
    };
    const operation = createOperation(ipcClient);

    await expect(operation.execute({})).resolves.toEqual({
      message: 'Overmind service is shutting down.',
    });

    expect(ipcClient.shutdown).toHaveBeenCalledTimes(1);
  });

  it('wraps cooperative shutdown failures with a config-specific message', async () => {
    const ipcClient = {
      shutdown: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    };
    const operation = createOperation(ipcClient);

    await expect(operation.execute({})).rejects.toThrow(
      'Overmind service is not running for config dir "C:\\temp\\overmind". Start it first or use --force to clean up a stale process.',
    );
  });

  it('performs force shutdown when requested', async () => {
    const ipcClient = {
      shutdown: vi.fn(),
    };
    const operation = createOperation(ipcClient);
    vi.spyOn(operation as never, 'forceKillAllProcesses').mockReturnValue(2);

    await expect(operation.execute({ force: true })).resolves.toEqual({
      message: 'Force shutdown complete. Killed 2 process(es).',
    });

    expect(ipcClient.shutdown).not.toHaveBeenCalled();
  });
});

function createOperation(ipcClient: { shutdown: ReturnType<typeof vi.fn> }): ShutdownOperation {
  const configOptions: OvermindConfigOptions = {
    configDir: 'C:\\temp\\overmind',
    resolvedConfigDir: 'C:\\temp\\overmind',
    instanceHash: 'deadbeef',
    instanceName: 'overmind',
    pipePath: '\\\\.\\pipe\\overmind-overmind-deadbeef',
  };

  const logger = {
    create: vi.fn().mockReturnValue({
      create: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      logLevel: vi.fn(),
      warn: vi.fn(),
    }),
    logLevel: vi.fn(),
  };

  return new ShutdownOperation(ipcClient as never, configOptions, logger as never);
}
