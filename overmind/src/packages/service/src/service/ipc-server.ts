
import fs from 'node:fs/promises';
import net from 'node:net';
import {
  type AttachCerebrateAckResponse,
  type AttachCerebrateParams,
  type CerebrateAttachOutputEvent,
  type OvermindIpcErrorResponse,
  type OvermindIpcRequest,
  type OvermindIpcResponse,
  getOvermindPipePath,
} from 'overmind-api';
import { singleton } from 'tsyringe';
import { type OvermindConfig } from '@overmind/config';

@singleton()
export class OvermindIpcServer {
  pipePath?: string;
  server?: net.Server;
  onDispatch?: (request: Exclude<OvermindIpcRequest, { method: 'cerebrate.attach' }>) => Promise<OvermindIpcResponse>;
  onSubscribeCerebrateOutput?: (name: string, listener: (line: string) => void) => () => void;
  stopping = false;

  async listen(
    config: OvermindConfig,
    listener: (request: Exclude<OvermindIpcRequest, { method: 'cerebrate.attach' }>) => Promise<OvermindIpcResponse>,
    attachListener: (name: string, lineListener: (line: string) => void) => () => void,
  ): Promise<void> {
    this.pipePath = getOvermindPipePath(config.configDir)
    this.server = net.createServer((socket) => {
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

    this.onDispatch = listener;
    this.onSubscribeCerebrateOutput = attachListener;

    await this.#removeSocketFileIfNeeded();

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(this.pipePath, () => {
        this.server?.off('error', reject);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
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
      unsubscribe = this.onSubscribeCerebrateOutput?.(params.name, (line: string) => {
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
    if (this.onDispatch) {
      return this.onDispatch(request);
    }

    throw new Error(`Internal IPC dispatch error: no dispatch listener registered for method ${request.method}`);
  }

  async #removeSocketFileIfNeeded(): Promise<void> {
    if (process.platform === 'win32') {
      return;
    }

    try {
      if (this.pipePath) {
        await fs.rm(this.pipePath, { force: true });
      }
    } catch {
      // Best-effort cleanup for Unix domain sockets.
    }
  }
}
