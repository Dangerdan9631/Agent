import { EventEmitter } from 'node:events';
import type net from 'node:net';

import type { AttachServerEventSink } from 'overmind-api';
import { describe, expect, it, vi } from 'vitest';

import { AttachStreamClient } from '../../src/core/attach-client.js';

class FakeSocket extends EventEmitter {
  destroyed = false;

  end(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.emit('close');
  }
}

describe('AttachStreamClient', () => {
  it('routes server events to listeners and terminates through the remote API', async () => {
    const socket = new FakeSocket();
    const closeConnection = vi.fn(async () => {
      socket.end();
    });
    let serverEvents: AttachServerEventSink | undefined;
    let resolveListen: (() => void) | undefined;
    const remoteApi = {
      attach: async (_request: { name?: string; historyPlaybackSize?: number }, events: AttachServerEventSink) => {
        serverEvents = events;
        await events.attached({ name: 'alpha' });
        await events.output({
          name: 'alpha',
          timestamp: 1_000,
          data: 'hello',
        });

        await new Promise<void>((resolve) => {
          resolveListen = resolve;
        });
      },
      terminateAttach: async (event: { name: string | undefined }) => {
        await serverEvents?.terminate(event);
        resolveListen?.();
      },
    };
    const client = new AttachStreamClient(
      { name: 'alpha', historyPlaybackSize: 100 },
      remoteApi,
      socket as unknown as net.Socket,
      closeConnection,
    );
    const attached = vi.fn();
    const output = vi.fn();
    const terminate = vi.fn();

    client.onAttached(attached);
    client.onOutput(output);
    client.onTerminate(terminate);

    const listenPromise = client.listen();
    await Promise.resolve();
    await client.terminate({ name: 'alpha' });
    await listenPromise;

    expect(attached).toHaveBeenCalledWith({ name: 'alpha' });
    expect(output).toHaveBeenCalledWith({
      name: 'alpha',
      timestamp: 1_000,
      data: 'hello',
    });
    expect(terminate).toHaveBeenCalledWith({ name: 'alpha' });
    expect(closeConnection).toHaveBeenCalledTimes(1);
  });

  it('reports post-connect remote errors through onError instead of rejecting listen', async () => {
    const socket = new FakeSocket();
    const closeConnection = vi.fn(async () => {
      socket.end();
    });
    const remoteApi = {
      attach: async (_request: { name?: string; historyPlaybackSize?: number }, events: AttachServerEventSink) => {
        await events.attached({ name: 'alpha' });
        throw new Error('stream failed');
      },
      terminateAttach: async () => undefined,
    };
    const client = new AttachStreamClient(
      { name: 'alpha' },
      remoteApi,
      socket as unknown as net.Socket,
      closeConnection,
    );
    const onError = vi.fn();

    client.onError(onError);

    await expect(client.listen()).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[0]?.message).toBe('stream failed');
    expect(closeConnection).toHaveBeenCalledTimes(1);
  });
});