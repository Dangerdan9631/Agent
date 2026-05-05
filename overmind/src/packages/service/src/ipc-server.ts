import fs from 'node:fs/promises';
import net from 'node:net';
import type {
  GetServiceStatsIpcRequest,
  GetServiceStatsIpcResponse,
  OvermindApi,
  ShutdownIpcRequest,
  ShutdownIpcResponse,
} from 'overmind-api';

export type OvermindIpcRequest = GetServiceStatsIpcRequest | ShutdownIpcRequest;
export type OvermindIpcResponse = GetServiceStatsIpcResponse | ShutdownIpcResponse;

interface OvermindIpcErrorResponse {
  method: string;
  error: string;
}

export class OvermindIpcServer {
  readonly #server: net.Server;
  readonly #service: OvermindApi;
  readonly #pipePath: string;
  #stopping = false;

  constructor(service: OvermindApi, pipePath: string) {
    this.#service = service;
    this.#pipePath = pipePath;
    this.#server = net.createServer((socket) => {
      let buffer = '';
      let handled = false;

      socket.setEncoding('utf8');
      socket.on('data', (chunk) => {
        buffer += chunk;
        if (handled || !buffer.includes('\n')) {
          return;
        }

        handled = true;
        const [rawRequest] = buffer.split('\n', 1);
        void this.#handleRequest(rawRequest, socket);
      });

      socket.on('error', () => {
        socket.destroy();
      });
    });
  }

  async listen(): Promise<void> {
    await this.#removeSocketFileIfNeeded();

    await new Promise<void>((resolve, reject) => {
      this.#server.once('error', reject);
      this.#server.listen(this.#pipePath, () => {
        this.#server.off('error', reject);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.#stopping) {
      return;
    }

    this.#stopping = true;

    await new Promise<void>((resolve, reject) => {
      this.#server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await this.#removeSocketFileIfNeeded();
  }

  async #handleRequest(rawRequest: string, socket: net.Socket): Promise<void> {
    let response: OvermindIpcResponse | OvermindIpcErrorResponse;

    try {
      const request = JSON.parse(rawRequest) as OvermindIpcRequest;
      response = await this.#dispatch(request);
    } catch (error) {
      response = {
        method: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown IPC error.',
      };
    }

    socket.end(`${JSON.stringify(response)}\n`);

    if (response.method === 'service.shutdown' && !('error' in response)) {
      setImmediate(() => {
        void this.close();
      });
    }
  }

  async #dispatch(request: OvermindIpcRequest): Promise<OvermindIpcResponse> {
    if (request.method === 'service.stats') {
      return {
        method: request.method,
        result: await this.#service.getServiceStats(request.params),
      };
    }

    if (request.method === 'service.shutdown') {
      return {
        method: request.method,
        result: await this.#service.shutdown(request.params),
      };
    }

    throw new Error(`Unsupported method: ${(request as { method: string }).method}`);
  }

  async #removeSocketFileIfNeeded(): Promise<void> {
    if (process.platform === 'win32') {
      return;
    }

    try {
      await fs.rm(this.#pipePath, { force: true });
    } catch {
      // Best-effort cleanup for Unix domain sockets.
    }
  }
}