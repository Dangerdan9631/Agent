import fs from 'node:fs/promises';
import net from 'node:net';
import type { Logger, LoggerFactory } from 'overmind-core';

enum RpcServerState {
  Uninitialized = 'uninitialized',
  Starting = 'starting',
  Started = 'started',
  Stopping = 'stopping',
  Stopped = 'stopped',
}

export class RpcServer {
  private state: RpcServerState = RpcServerState.Uninitialized;
  private readonly server: net.Server;
  private readonly logger: Logger;

  constructor(
    private readonly pipePath: string,
    onConnection: (socket: net.Socket) => void,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('RpcServer');
    this.server = net.createServer((socket) => {
      onConnection(socket);
    });
  }

  async listen(): Promise<void> {
    if (this.state !== RpcServerState.Uninitialized) {
      throw new Error(`Cannot start IPC server in state ${this.state}`);
    }

    this.state = RpcServerState.Starting;
    await this.cleanUpSocketFile();

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        this.state = RpcServerState.Stopped;
        reject(error);
      };

      this.server
        .once('close', async () => {
          this.state = RpcServerState.Stopped;
          await this.cleanUpSocketFile();
        })
        .once('error', handleError)
        .listen(this.pipePath, () => {
          this.state = RpcServerState.Started;
          this.server.off('error', handleError);
          this.logger.info('rpc server listening', this.pipePath);
          resolve();
        });
    });
  }

  async close(): Promise<void> {
    if (this.state !== RpcServerState.Started) {
      throw new Error(`Cannot stop IPC server in state ${this.state}`);
    }

    this.state = RpcServerState.Stopping;
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private async cleanUpSocketFile(): Promise<void> {
    if (process.platform === 'win32') {
      return;
    }

    try {
      await fs.rm(this.pipePath, { force: true });
    } catch {
      // Best-effort cleanup for Unix domain sockets.
    }
  }
}
