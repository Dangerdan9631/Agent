import 'reflect-metadata';

import type { OvermindConfigOptions } from '@overmind-sdk/config';
import { describe, expect, it, vi } from 'vitest';

import { OvermindApiHandler } from '../../src/operations/overmind-api-handler.js';

describe('OvermindApiHandler', () => {
  it('delegates workflow starts to the IPC client', async () => {
    const overmindIpcClient = {
      startCerebrateWorkflow: vi.fn(async () => ({
        cerebrateName: 'hello',
        workflowName: 'daily-review',
        initialState: 'inspect',
        status: 'running' as const,
      })),
    };

    const handler = new OvermindApiHandler(
      {} as never,
      {} as never,
      overmindIpcClient as never,
      createConfigOptions(),
      createLoggerFactory() as never,
    );

    await expect(
      handler.startCerebrateWorkflow({ cerebrateName: 'hello', workflowName: 'daily-review' }),
    ).resolves.toEqual({
      cerebrateName: 'hello',
      workflowName: 'daily-review',
      initialState: 'inspect',
      status: 'running',
    });

    expect(overmindIpcClient.startCerebrateWorkflow).toHaveBeenCalledWith({
      cerebrateName: 'hello',
      workflowName: 'daily-review',
    });
  });
});

function createConfigOptions(): OvermindConfigOptions {
  return {
    configDir: 'C:\\temp\\overmind',
    resolvedConfigDir: 'C:\\temp\\overmind',
    instanceHash: 'deadbeef',
    instanceName: 'overmind',
    pipePath: '\\\\.\\pipe\\overmind-overmind-deadbeef',
  };
}

function createLoggerFactory() {
  return {
    create: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      info: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    })),
  };
}
