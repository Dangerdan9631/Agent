import 'reflect-metadata';

import net from 'node:net';

import { NodeIo, RPCChannel } from 'kkrpc';
import type { OvermindConfigOptions } from 'overmind-sdk/config';
import { afterEach, describe, expect, it } from 'vitest';

import { OvermindIpcClient } from '../../src/ipc/overmind-ipc-client.js';

const socketsToClean = new Set<string>();

afterEach(async () => {
  for (const pipePath of socketsToClean) {
    try {
      await new Promise<void>((resolve) => {
        const cleanupClient = net.createConnection(pipePath);
        cleanupClient.once('error', () => resolve());
        cleanupClient.once('connect', () => {
          cleanupClient.end();
          cleanupClient.once('close', () => resolve());
        });
      });
    } finally {
      socketsToClean.delete(pipePath);
    }
  }
});

describe('OvermindIpcClient', () => {
  it('fetches stats from the remote IPC API', async () => {
    const pipePath = createPipePath('stats');
    const server = await listenWithApi(pipePath, {
      async getStats() {
        return {
          cerebrates: [],
          runningCerebrateCount: 0,
          uptime: 12,
        };
      },
      async shutdown() {
        return { message: 'unused' };
      },
    });

    try {
      const client = createClient(pipePath);
      await expect(client.getStats({})).resolves.toEqual({
        cerebrates: [],
        runningCerebrateCount: 0,
        uptime: 12,
      });
    } finally {
      await closeServer(server);
    }
  });

  it('forwards shutdown requests to the remote IPC API', async () => {
    const pipePath = createPipePath('shutdown');
    const server = await listenWithApi(pipePath, {
      async getStats() {
        return {
          cerebrates: [],
          runningCerebrateCount: 0,
          uptime: 0,
        };
      },
      async shutdown() {
        return { message: 'Overmind service is shutting down.' };
      },
    });

    try {
      const client = createClient(pipePath);
      await expect(client.shutdown({})).resolves.toEqual({
        message: 'Overmind service is shutting down.',
      });
    } finally {
      await closeServer(server);
    }
  });
});

function createClient(pipePath: string): OvermindIpcClient {
  const configOptions: OvermindConfigOptions = {
    configDir: pipePath,
    resolvedConfigDir: pipePath,
    instanceHash: 'deadbeef',
    instanceName: 'test-instance',
    pipePath,
  };

  return new OvermindIpcClient(configOptions);
}

async function listenWithApi(
  pipePath: string,
  api: {
    getStats: () => Promise<{ uptime: number; runningCerebrateCount: number; cerebrates: [] }>;
    shutdown: () => Promise<{ message: string }>;
  },
): Promise<net.Server> {
  const server = net.createServer((socket) => {
    const io = new NodeIo(socket, socket);
    new RPCChannel(io, { expose: api });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(pipePath, () => {
      server.off('error', reject);
      resolve();
    });
  });

  socketsToClean.add(pipePath);
  return server;
}

async function closeServer(server: net.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createPipePath(suffix: string): string {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\overmind-ipc-client-${suffix}-${Date.now()}-${Math.random()}`;
  }

  return `/tmp/overmind-ipc-client-${suffix}-${Date.now()}-${Math.random()}.sock`;
}
