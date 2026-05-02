import net from 'net';
import { randomUUID } from 'crypto';
import {
  SOCKET_PATH,
  encodeMessage,
  decodeMessages,
  IpcResponseSchema,
  IpcEventSchema,
} from './protocol.js';

type EventHandler = (data: unknown) => void;

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export class IpcClient {
  private socket: net.Socket | null = null;
  private buffer = '';
  private pending = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<EventHandler>>();

  connect(socketPath: string = SOCKET_PATH): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(socketPath, () => {
        this.socket = socket;
        resolve();
      });

      socket.on('data', (chunk) => {
        const { messages, remaining } = decodeMessages(chunk.toString(), this.buffer);
        this.buffer = remaining;
        for (const msg of messages) {
          this.handleMessage(msg);
        }
      });

      socket.on('error', (err) => {
        if (!this.socket) {
          reject(err);
          return;
        }
        this.pending.forEach((p) => p.reject(err));
        this.pending.clear();
      });

      socket.on('close', () => {
        this.socket = null;
      });
    });
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to service'));
        return;
      }
      const id = randomUUID();
      this.pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
      });
      this.socket.write(encodeMessage({ id, method, params }));
    });
  }

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.eventHandlers.get(event)?.delete(handler);
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket !== null;
  }

  private handleMessage(msg: unknown): void {
    const responseResult = IpcResponseSchema.safeParse(msg);
    if (responseResult.success) {
      const response = responseResult.data;
      const pending = this.pending.get(response.id);
      if (pending) {
        this.pending.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    const eventResult = IpcEventSchema.safeParse(msg);
    if (eventResult.success) {
      const { event, data } = eventResult.data;
      this.eventHandlers.get(event)?.forEach((h) => h(data));
    }
  }
}
