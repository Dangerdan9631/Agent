import 'reflect-metadata';

import { spawn } from 'node:child_process';

import type { OvermindConfigOptions } from '@overmind-sdk/config';
import { describe, expect, it, vi } from 'vitest';

import { StartOperation } from '../../src/operations/start.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('StartOperation', () => {
  it('throws when the service is already running for the config dir', async () => {
    const operation = createOperation();
    vi.spyOn(operation as never, 'isRunning').mockResolvedValue(true);

    await expect(operation.execute({})).rejects.toThrow(
      'Overmind service is already running for config dir "C:\\temp\\overmind".',
    );

    expect(spawn).not.toHaveBeenCalled();
  });

  it('spawns the service and waits for startup when it is not running', async () => {
    const operation = createOperation();
    const child = {
      stderr: {
        on: vi.fn(),
      },
      unref: vi.fn(),
    };

    vi.mocked(spawn).mockReturnValue(child as never);
    vi.spyOn(operation as never, 'isRunning').mockResolvedValue(false);
    vi.spyOn(operation as never, 'resolveServiceBinPath').mockReturnValue('/service/bin.js');
    vi.spyOn(operation as never, 'waitForService').mockResolvedValue(undefined);

    await expect(operation.execute({})).resolves.toEqual({
      message: 'Service started successfully.',
    });

    expect(spawn).toHaveBeenCalledWith(process.execPath, ['/service/bin.js', 'C:\\temp\\overmind'], {
      detached: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    expect(child.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
    expect(child.unref).toHaveBeenCalledTimes(1);
  });
});

function createOperation(): StartOperation {
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

  return new StartOperation({} as never, configOptions, logger as never);
}
