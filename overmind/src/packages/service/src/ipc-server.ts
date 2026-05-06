import fs from 'node:fs/promises';
import net from 'node:net';
import type {
  AttachCerebrateAckResponse,
  AttachCerebrateParams,
  CerebrateAttachOutputEvent,
  GetServiceStatsIpcRequest,
  GetServiceStatsIpcResponse,
  SendCerebrateCommandIpcRequest,
  SendCerebrateCommandIpcResponse,
  ShutdownIpcRequest,
  ShutdownIpcResponse,
  StartCerebrateIpcRequest,
  StartCerebrateIpcResponse,
  StopCerebrateIpcRequest,
  StopCerebrateIpcResponse,
} from 'overmind-api';
import { OvermindService } from './service.js';

export type OvermindIpcRequest =
  | GetServiceStatsIpcRequest
  | ShutdownIpcRequest
  | StartCerebrateIpcRequest
  | StopCerebrateIpcRequest
  | SendCerebrateCommandIpcRequest
  | { method: 'cerebrate.attach'; params: AttachCerebrateParams };

export type OvermindIpcResponse =
  | GetServiceStatsIpcResponse
  | ShutdownIpcResponse
  | StartCerebrateIpcResponse
  | StopCerebrateIpcResponse
  | SendCerebrateCommandIpcResponse;

interface OvermindIpcErrorResponse {
  method: string;
  error: string;
}

export class OvermindIpcServer {
  readonly #server: net.Server;
  readonly #service: OvermindService;
  readonly #pipePath: string;
  #stopping = false;

  constructor(service: OvermindService, pipePath: string) {
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
        void this.#handleFirstLine(rawRequest, socket);
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

  async #handleFirstLine(rawRequest: string, socket: net.Socket): Promise<void> {
    try {
      const request = JSON.parse(rawRequest) as OvermindIpcRequest;

      if (request.method === 'cerebrate.attach') {
        await this.#handleAttach(request.params, socket);
        return;
      }

      const response = await this.#dispatch(request as Exclude<OvermindIpcRequest, { method: 'cerebrate.attach' }>);
      socket.end(`${JSON.stringify(response)}\n`);

      if (response.method === 'service.shutdown' && !('error' in response)) {
        setImmediate(() => {
          void this.close();
        });
      }
    } catch (error) {
      const response: OvermindIpcErrorResponse = {
        method: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown IPC error.',
      };
      socket.end(`${JSON.stringify(response)}\n`);
    }
  }

  async #handleAttach(params: AttachCerebrateParams, socket: net.Socket): Promise<void> {
    let unsubscribe: (() => void) | undefined;

    const cleanup = (): void => {
      unsubscribe?.();
      unsubscribe = undefined;
    };

    socket.once('close', cleanup);
    socket.once('error', cleanup);

    try {
      unsubscribe = this.#service.subscribeCerebrateOutput(params.name, (line: string) => {
        const event: CerebrateAttachOutputEvent = { type: 'output', line };
        socket.write(`${JSON.stringify(event)}\n`);
      });
    } catch (error) {
      const response: OvermindIpcErrorResponse = {
        method: 'cerebrate.attach',
        error: error instanceof Error ? error.message : 'Unknown IPC error.',
      };
      socket.end(`${JSON.stringify(response)}\n`);
      return;
    }

    const ack: AttachCerebrateAckResponse = { method: 'cerebrate.attach', ack: true };
    socket.write(`${JSON.stringify(ack)}\n`);
  }

  async #dispatch(request: Exclude<OvermindIpcRequest, { method: 'cerebrate.attach' }>): Promise<OvermindIpcResponse> {
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

    if (request.method === 'cerebrate.start') {
      return {
        method: request.method,
        result: await this.#service.startCerebrate(request.params),
      };
    }

    if (request.method === 'cerebrate.stop') {
      return {
        method: request.method,
        result: await this.#service.stopCerebrate(request.params),
      };
    }

    if (request.method === 'cerebrate.command') {
      return {
        method: request.method,
        result: await this.#service.sendCerebrateCommand(request.params),
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
