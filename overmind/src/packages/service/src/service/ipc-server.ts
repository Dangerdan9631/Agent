import {
  IpcConnection,
  type IpcConnectionListener,
  type Logger,
  type LoggerFactory
} from 'overmind-core';
import fs from 'node:fs/promises';
import net from 'node:net';
import { singleton } from 'tsyringe';

enum IpcServerState {
  Uninitialized = 'uninitialized',
  Starting = 'starting',
  Started = 'started',
  Stopping = 'stopping',
  Stopped = 'stopped',
}

@singleton()
export class IpcServer {
  private state: IpcServerState = IpcServerState.Uninitialized;
  private server: net.Server;
  private logger: Logger;

  constructor(
    private readonly pipePath: string,
    listener: IpcConnectionListener,
    loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory.create('IpcServer');
    this.server = net.createServer((socket) => {
      new IpcConnection(socket, listener, this.logger);
    });
  }

  send(socket: net.Socket, message: string): void {
    this.logger.debug('Send:', message);
    socket.write(message.trimEnd() + '\n');
  }

  async listen(): Promise<void> {
    if (this.state !== IpcServerState.Uninitialized) {
      throw new Error(`Cannot start IPC server in state ${this.state}`);
    }
    this.state = IpcServerState.Starting;

    await this.cleanUpSocketFile();

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        this.state = IpcServerState.Stopped;
        reject(error);
      };

      this.server
        .once('close', async () => {
          this.state = IpcServerState.Stopped;
          await this.cleanUpSocketFile();
        })
        .once('error', handleError)
        .listen(this.pipePath, () => {
          this.state = IpcServerState.Started;
          this.server.off('error', handleError);
          resolve();
        });
    });
  }

  async close(): Promise<void> {
    if (this.state !== IpcServerState.Started) {
      throw new Error(`Cannot stop IPC server in state ${this.state}`);
    }

    this.state = IpcServerState.Stopping;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) reject(error)
        else resolve();
      });
    });
  }

  private async cleanUpSocketFile(): Promise<void> {
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
