import net from 'node:net';
import type {
  AttachRequest,
  OvermindIpcClientMessageEnvelope,
  OvermindIpcServerMessageEnvelope,
  OvermindIpcServerStreamMessageEnvelope,
} from 'overmind-api';
import { inject, singleton } from 'tsyringe';
import { CerebrateController, ServiceController } from '@overmind/controllers';
import { OvermindIpcServer } from './ipc-server';
import { type OvermindConfig, OvermindConfigToken } from '@overmind/config';

@singleton()
export class OvermindService {
  constructor(
    @inject(OvermindConfigToken) private readonly config: OvermindConfig,
    private readonly ipcServer: OvermindIpcServer,
    private readonly serviceController: ServiceController,
    private readonly cerebrateController: CerebrateController,
  ) {}

  async start(): Promise<void> {
    await this.ipcServer.listen(
      this.config,
      this.#dispatch.bind(this),
      this.#handleAttach.bind(this),
    );
  }

  async #dispatch(envelope: OvermindIpcClientMessageEnvelope): Promise<OvermindIpcServerMessageEnvelope> {
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

  async #handleAttach(request: AttachRequest, socket: net.Socket): Promise<void> {
    let unsubscribe: (() => void) | undefined;

    const cleanup = (): void => {
      unsubscribe?.();
      unsubscribe = undefined;
    };

    socket.once('close', cleanup);
    socket.once('error', cleanup);

    try {
      unsubscribe = this.cerebrateController.subscribeCerebrateOutput(
        request.name ?? '',
        (line: string) => {
          const output: OvermindIpcServerStreamMessageEnvelope = {
            method: 'service.attach',
            message: { packet: 'output', data: { name: request.name, timestamp: Date.now(), data: line } },
          };
          socket.write(`${JSON.stringify(output)}\n`);
        },
      );
    } catch (error) {
      const errorResponse = {
        method: 'service.attach',
        error: error instanceof Error ? error.message : 'Unknown IPC error.',
      };
      socket.end(`${JSON.stringify(errorResponse)}\n`);
      return;
    }

    const ack: OvermindIpcServerStreamMessageEnvelope = {
      method: 'service.attach',
      message: { packet: 'ack', data: { name: request.name } },
    };
    socket.write(`${JSON.stringify(ack)}\n`);
  }
}
