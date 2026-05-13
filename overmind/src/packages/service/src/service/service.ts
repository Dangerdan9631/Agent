import net from 'node:net';
import type {
  AttachRequest,
  OvermindIpcClientMessageEnvelope,
  OvermindIpcServerMessageEnvelope,
  OvermindIpcServerStreamMessageEnvelope,
} from 'overmind-api';
import { inject, singleton } from 'tsyringe';
import { CerebrateController, ServiceController } from '@overmind/controllers';
import { BufferedLogBuffer, LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { OvermindIpcServer } from './ipc-server';
import { type OvermindConfig, OvermindConfigToken } from '@overmind/config';

@singleton()
export class OvermindService {
  private readonly logger: Logger;

  constructor(
    @inject(OvermindConfigToken) private readonly config: OvermindConfig,
    private readonly ipcServer: OvermindIpcServer,
    private readonly serviceController: ServiceController,
    private readonly cerebrateController: CerebrateController,
    private readonly logBuffer: BufferedLogBuffer,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('OvermindService');
  }

  async start(): Promise<void> {
    await this.ipcServer.listen(
      this.config,
      this.dispatch.bind(this),
      this.handleAttach.bind(this),
    );
    this.logger.info('listening on', this.config.configDir);
  }

  private async dispatch(envelope: OvermindIpcClientMessageEnvelope): Promise<OvermindIpcServerMessageEnvelope> {
    this.logger.info('handling', envelope.method);

    switch (envelope.method) {
      case 'service.stats':
        return {
          method: envelope.method,
          message: await this.serviceController.getServiceStats(envelope.message),
        };
      case 'service.shutdown':
        return {
          method: envelope.method,
          message: await this.serviceController.shutdown(envelope.message),
        };
      case 'cerebrate.start':
        return {
          method: envelope.method,
          message: await this.cerebrateController.startCerebrate(envelope.message),
        };
      case 'cerebrate.stop':
        return {
          method: envelope.method,
          message: await this.cerebrateController.stopCerebrate(envelope.message),
        };
      case 'cerebrate.command':
        return {
          method: envelope.method,
          message: await this.cerebrateController.sendCerebrateCommand(envelope.message),
        };
      default:
        throw new Error(`Unsupported method: ${(envelope as { method: string }).method}`);
    }
  }

  private async handleAttach(request: AttachRequest, socket: net.Socket): Promise<void> {
    let unsubscribe: (() => void) | undefined;
    const streamName = request.name;

    const cleanup = (): void => {
      if (streamName === undefined) {
        this.logger.info('attach stream closed');
      }
      unsubscribe?.();
      unsubscribe = undefined;
    };

    socket.once('close', cleanup);
    socket.once('error', cleanup);

    try {
      unsubscribe = this.subscribeAttachStream(request, (timestamp: Date, line: string) => {
        const output: OvermindIpcServerStreamMessageEnvelope = {
          method: 'service.attach',
          message: { packet: 'output', data: { name: streamName, timestamp: timestamp.valueOf(), data: line } },
        };
        socket.write(`${JSON.stringify(output)}\n`);
      });
    } catch (error) {
      this.logger.error('attach failed', error);
      const errorResponse = {
        method: 'service.attach',
        error: error instanceof Error ? error.message : 'Unknown IPC error.',
      };
      socket.end(`${JSON.stringify(errorResponse)}\n`);
      return;
    }

    const ack: OvermindIpcServerStreamMessageEnvelope = {
      method: 'service.attach',
      message: { packet: 'ack', data: { name: streamName } },
    };
    socket.write(`${JSON.stringify(ack)}\n`);

    if (streamName === undefined) {
      this.logger.info('attach stream opened');
    }
  }

  private subscribeAttachStream(request: AttachRequest, listener: (timestamp: Date, line: string) => void): () => void {
    return this.logBuffer.subscribe((event) => {
      listener(event.timestamp, event.line);
    }, request.historyPlaybackSize, request.name);
  }
}
