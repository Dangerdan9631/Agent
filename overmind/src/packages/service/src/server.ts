import net from 'net';
import {
  SOCKET_PATH,
  encodeMessage,
  decodeMessages,
  IpcRequestSchema,
} from 'overmind';
import type { OvermindApi, OvermindApiMethod } from 'overmind-api';
import { controllers } from './controllers/index.js';

export class IpcServer {
  private server: net.Server;
  private service: OvermindApi;

  constructor(service: OvermindApi) {
    this.service = service;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  listen(socketPath: string = SOCKET_PATH): void {
    this.server.listen(socketPath, () => {
      console.log(`[overmind-service] Listening on ${socketPath}`);
    });

    this.server.on('error', (err: Error) => {
      console.error('[overmind-service] Server error:', err);
    });
  }

  close(callback?: () => void): void {
    this.server.close(callback);
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = '';

    socket.on('data', (chunk: Buffer) => {
      const { messages, remaining } = decodeMessages(chunk.toString(), buffer);
      buffer = remaining;
      for (const msg of messages) {
        this.handleRequest(socket, msg);
      }
    });

    socket.on('error', () => {/* client disconnected */});
  }

  private handleRequest(socket: net.Socket, msg: unknown): void {
    const parsed = IpcRequestSchema.safeParse(msg);
    if (!parsed.success) return;

    const { id, method, params } = parsed.data;

    this.route(socket, method, params)
      .then((result) => {
        if (socket.writable) {
          socket.write(encodeMessage({ id, result }));
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (socket.writable) {
          socket.write(encodeMessage({ id, error: { code: -1, message } }));
        }
      });
  }

  private async route(_socket: net.Socket, method: string, params: unknown): Promise<unknown> {
    const controller = controllers[method as OvermindApiMethod];
    if (!controller) {
      throw new Error(`Unknown method: ${method}`);
    }

    return controller(this.service, params ?? {});
  }
}
