
import fs from 'node:fs/promises';
import net from 'node:net';
import {
  type AttachRequest,
  type OvermindIpcClientMessageEnvelope,
  type OvermindIpcServerMessageEnvelope,
  getOvermindPipePath,
} from 'overmind-api';
import { singleton } from 'tsyringe';
import { type OvermindConfig } from '@overmind/config';

type DispatchHandler = (request: OvermindIpcClientMessageEnvelope) => Promise<OvermindIpcServerMessageEnvelope>;
type AttachHandler = (request: AttachRequest, socket: net.Socket) => Promise<void>;

@singleton()
export class OvermindIpcServer {
  pipePath?: string;
  server?: net.Server;
  stopping = false;

  async listen(
    config: OvermindConfig,
    dispatch: DispatchHandler,
    attach: AttachHandler,
  ): Promise<void> {
    this.pipePath = getOvermindPipePath(config.configDir);
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
        void this.#handleFirstLine(rawRequest, socket, dispatch, attach);
      });

      socket.on('error', () => {
        socket.destroy();
      });
    });

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

  async #handleFirstLine(
    rawRequest: string,
    socket: net.Socket,
    dispatch: DispatchHandler,
    attach: AttachHandler,
  ): Promise<void> {
    try {
      const envelope = JSON.parse(rawRequest) as { method: string; message: unknown };

      if (envelope.method === 'service.attach') {
        await attach(envelope.message as AttachRequest, socket);
        return;
      }

      const response = await dispatch(envelope as OvermindIpcClientMessageEnvelope);
      socket.end(`${JSON.stringify(response)}\n`);

      if (response.method === 'service.shutdown' && response.message.success) {
        setImmediate(() => {
          void this.close();
        });
      }
    } catch (error) {
      const errorResponse = {
        method: 'unknown',
        message: {
          success: false,
          error: { errorMessage: error instanceof Error ? error.message : 'Unknown IPC error.' },
        },
      };
      socket.end(`${JSON.stringify(errorResponse)}\n`);
    }
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
