import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { OvermindConnectionHandler } from '../../src/service/overmind-connection-handler.js';

describe('OvermindConnectionHandler', () => {
  it('keeps attach active until terminateAttach is called on the same connection api', async () => {
    const service = {
      attach: vi.fn(async (request, events, onDisconnect, onTerminate) => {
        onDisconnect(() => undefined);
        onTerminate(async (event) => {
          await events.terminate(event);
        });
        await events.output({
          name: request.name,
          timestamp: 1_000,
          data: 'before-attach-close',
        });
        await events.attached({ name: request.name });
      }),
      getStats: vi.fn(),
      sendCerebrateCommand: vi.fn(),
      shutdown: vi.fn(),
      startCerebrate: vi.fn(),
      startCerebrateWorkflow: vi.fn(),
      stop: vi.fn(),
      stopCerebrate: vi.fn(),
    };

    const handler = new OvermindConnectionHandler(service as never);
    const api = (handler as never).createConnectionApi(new Set<() => void>()) as {
      attach: OvermindConnectionHandler['attach'];
      terminateAttach: OvermindConnectionHandler['terminateAttach'];
    };
    const attached = vi.fn();
    const output = vi.fn();
    const terminated = vi.fn();

    const attachPromise = api.attach(
      { name: 'hello', historyPlaybackSize: 5 },
      attached,
      output,
      terminated,
    );

    await vi.waitFor(() => {
      expect(attached).toHaveBeenCalledWith({ name: 'hello' });
    });

    expect(output).toHaveBeenCalledWith({
      name: 'hello',
      timestamp: 1_000,
      data: 'before-attach-close',
    });

    await api.terminateAttach({ name: 'hello' });
    await expect(attachPromise).resolves.toBeUndefined();
    expect(terminated).toHaveBeenCalledWith({ name: 'hello' });
  });

  it('rejects a second attach while one is active on the same connection api', async () => {
    const service = {
      attach: vi.fn(async (_request, events, _onDisconnect, onTerminate) => {
        onTerminate(async (event) => {
          await events.terminate(event);
        });
        await events.attached({ name: 'hello' });
      }),
      getStats: vi.fn(),
      sendCerebrateCommand: vi.fn(),
      shutdown: vi.fn(),
      startCerebrate: vi.fn(),
      startCerebrateWorkflow: vi.fn(),
      stop: vi.fn(),
      stopCerebrate: vi.fn(),
    };

    const handler = new OvermindConnectionHandler(service as never);
    const api = (handler as never).createConnectionApi(new Set<() => void>()) as {
      attach: OvermindConnectionHandler['attach'];
      terminateAttach: OvermindConnectionHandler['terminateAttach'];
    };
    let resolveAttached: (() => void) | undefined;
    const attachedPromise = new Promise<void>((resolve) => {
      resolveAttached = resolve;
    });

    const attachPromise = api.attach(
      { name: 'hello', historyPlaybackSize: 1 },
      async () => {
        resolveAttached?.();
      },
      async () => undefined,
      async () => undefined,
    );
    await attachedPromise;
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(
      api.attach(
        { historyPlaybackSize: 1 },
        async () => undefined,
        async () => undefined,
        async () => undefined,
      ),
    ).rejects.toThrow('An attach stream is already active on this connection.');

    await api.terminateAttach({ name: 'hello' });
    await expect(attachPromise).resolves.toBeUndefined();
  });

  it('delegates workflow starts to the service', async () => {
    const service = {
      attach: vi.fn(),
      getStats: vi.fn(),
      sendCerebrateCommand: vi.fn(),
      shutdown: vi.fn(),
      startCerebrate: vi.fn(),
      startCerebrateWorkflow: vi.fn(async () => ({
        cerebrateName: 'hello',
        workflowName: 'daily-review',
        initialState: 'inspect',
        status: 'running' as const,
      })),
      stop: vi.fn(),
      stopCerebrate: vi.fn(),
    };

    const handler = new OvermindConnectionHandler(service as never);

    await expect(
      handler.startCerebrateWorkflow({ cerebrateName: 'hello', workflowName: 'daily-review' }),
    ).resolves.toEqual({
      cerebrateName: 'hello',
      workflowName: 'daily-review',
      initialState: 'inspect',
      status: 'running',
    });
  });
});
