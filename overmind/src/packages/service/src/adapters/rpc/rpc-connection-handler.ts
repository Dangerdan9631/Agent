import type { AttachEventTerminate, AttachRequest, AttachServerEventSink, GetServiceStatsRequest, OvermindRpcApi, SendCerebrateCommandRequest, ShutdownRequest, StartCerebrateRequest, StopCerebrateRequest } from 'overmind-api';
import { createRpcChannel, type Logger, type LoggerFactory } from 'overmind-core';
import type net from 'node:net';
import { AttachToOutputUseCase } from '../../application/use-cases/attach-to-output.js';
import { GetServiceStatsUseCase } from '../../application/use-cases/get-service-stats.js';
import { SendCerebrateCommandUseCase } from '../../application/use-cases/send-cerebrate-command.js';
import { ShutdownServiceUseCase } from '../../application/use-cases/shutdown-service.js';
import { StartCerebrateUseCase } from '../../application/use-cases/start-cerebrate.js';
import { StopCerebrateUseCase } from '../../application/use-cases/stop-cerebrate.js';

type AttachConnectionState = {
  resolveListen?: () => void;
  terminate?: (event: AttachEventTerminate) => Promise<void>;
};

export class RpcConnectionHandler {
  private readonly logger: Logger;

  constructor(
    private readonly attachToOutput: AttachToOutputUseCase,
    private readonly getServiceStats: GetServiceStatsUseCase,
    private readonly sendCerebrateCommand: SendCerebrateCommandUseCase,
    private readonly shutdownService: ShutdownServiceUseCase,
    private readonly startCerebrate: StartCerebrateUseCase,
    private readonly stopCerebrate: StopCerebrateUseCase,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('RpcConnectionHandler');
  }

  handleConnection(socket: net.Socket): void {
    const disconnectHandlers = new Set<() => void>();
    const cleanup = () => {
      for (const disconnect of disconnectHandlers) {
        try {
          disconnect();
        } catch (error) {
          this.logger.error(error instanceof Error ? error.message : String(error));
        }
      }

      disconnectHandlers.clear();
    };

    socket.once('close', cleanup);
    socket.once('error', (error) => {
      this.logger.error(error.message);
      cleanup();
    });

    const api = this.createConnectionApi(disconnectHandlers);
    createRpcChannel<OvermindRpcApi, Record<string, never>>(socket, api);
  }

  private createConnectionApi(disconnectHandlers: Set<() => void>): OvermindRpcApi {
    const attachState: AttachConnectionState = {};

    return {
      getServiceStats: (request: GetServiceStatsRequest) => this.getServiceStats.execute(request),
      shutdown: (request: ShutdownRequest) => this.shutdownService.execute(request),
      attach: async (request: AttachRequest, events: AttachServerEventSink) => {
        if (attachState.resolveListen) {
          throw new Error('An attach stream is already active on this connection.');
        }

        await this.attachToOutput.execute(
          request,
          events,
          (disconnect) => {
            disconnectHandlers.add(disconnect);
          },
          (terminate) => {
            attachState.terminate = terminate;
          },
        );

        await new Promise<void>((resolve) => {
          const resolveListen = () => {
            disconnectHandlers.delete(resolveListen);
            attachState.resolveListen = undefined;
            attachState.terminate = undefined;
            resolve();
          };

          attachState.resolveListen = resolveListen;
          disconnectHandlers.add(resolveListen);
        });
      },
      terminateAttach: async (event: AttachEventTerminate) => {
        if (!attachState.resolveListen) {
          return;
        }

        try {
          if (attachState.terminate) {
            await attachState.terminate(event);
          }
        } finally {
          attachState.resolveListen();
        }
      },
      startCerebrate: (request: StartCerebrateRequest) => this.startCerebrate.execute(request),
      stopCerebrate: (request: StopCerebrateRequest) => this.stopCerebrate.execute(request),
      sendCerebrateCommand: (request: SendCerebrateCommandRequest) => this.sendCerebrateCommand.execute(request),
    };
  }
}
