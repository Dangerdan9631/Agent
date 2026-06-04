import type net from 'node:net';

type MessageListener = (message: string) => void;
type ErrorListener = (error: Error) => void;

export class SafeNodeIo {
  readonly name = 'safe-node-io';
  readonly capabilities = { structuredClone: false, transfer: false };

  private readonly messageListeners = new Set<MessageListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly messageQueue: string[] = [];
  private resolveRead: ((message: string | null) => void) | null = null;

  constructor(
    private readonly readStream: net.Socket,
    private readonly writeStream: net.Socket,
  ) {
    this.readStream.on('error', (error) => {
      this.errorListeners.forEach((listener) => listener(error));
      if (this.resolveRead) {
        this.resolveRead(null);
        this.resolveRead = null;
      }
    });
    this.readStream.on('data', (chunk: Buffer) => {
      const message = new TextDecoder().decode(chunk);
      if (this.messageListeners.size > 0) {
        this.messageListeners.forEach((listener) => listener(message));
      } else if (this.resolveRead) {
        this.resolveRead(message);
        this.resolveRead = null;
      } else {
        this.messageQueue.push(message);
      }
    });
    this.readStream.on('end', () => {
      if (this.resolveRead) {
        this.resolveRead(null);
        this.resolveRead = null;
      }
    });
  }

  on(event: 'message' | 'error', listener: MessageListener | ErrorListener): void {
    if (event === 'message') {
      this.messageListeners.add(listener as MessageListener);
      return;
    }

    this.errorListeners.add(listener as ErrorListener);
  }

  off(event: 'message' | 'error', listener: MessageListener | ErrorListener): void {
    if (event === 'message') {
      this.messageListeners.delete(listener as MessageListener);
      return;
    }

    this.errorListeners.delete(listener as ErrorListener);
  }

  async read(): Promise<string | null> {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift() ?? null;
    }

    return await new Promise((resolve) => {
      this.resolveRead = resolve;
    });
  }

  async write(message: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.writeStream.write(message, (error) => {
        if (!error) {
          resolve();
          return;
        }

        if (error.code === 'EPIPE' || error.code === 'ERR_STREAM_WRITE_AFTER_END') {
          resolve();
          return;
        }

        reject(error);
      });
    });
  }
}
