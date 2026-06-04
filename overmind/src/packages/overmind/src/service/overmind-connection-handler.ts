import type net from 'node:net';

import { RPCChannel } from 'kkrpc';
import type {
  AttachEventAttached,
  AttachEventListener,
  AttachEventOutput,
  AttachEventTerminate,
  AttachRequest,
  GetStatsRequest,
  GetStatsResponse,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StartCerebrateWorkflowRequest,
  StartCerebrateWorkflowResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-sdk/api';
import type { OvermindIpcApi } from 'overmind-sdk/ipc';
import { injectable } from 'tsyringe';

import { OvermindService } from './overmind-service.js';
import { SafeNodeIo } from './safe-node-io.js';

@injectable()
export class OvermindConnectionHandler implements OvermindIpcApi {
  constructor(private readonly overmindService: OvermindService) {}

  handleConnection(socket: net.Socket): void {
    const disconnectHandlers = new Set<() => void>();
    const cleanup = () => {
      for (const disconnect of disconnectHandlers) {
        try {
          disconnect();
        } catch {
          // Best-effort cleanup only.
        }
      }

      disconnectHandlers.clear();
    };

    socket.once('close', cleanup);
    socket.once('error', cleanup);

    const io = new SafeNodeIo(socket, socket);
    new RPCChannel<OvermindIpcApi, Record<string, never>>(io, {
      expose: this.createConnectionApi(disconnectHandlers),
    });
  }

  async getStats(request: GetStatsRequest): Promise<GetStatsResponse> {
    return await this.overmindService.getStats(request);
  }

  async shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
    const response = await this.overmindService.shutdown(request);
    setTimeout(() => {
      try {
        this.overmindService.stop();
      } catch {
        // Ignore shutdown races after the response has been sent.
      }
    }, 0);
    return response;
  }

  async attach(
    request: AttachRequest,
    onAttached: AttachEventListener<AttachEventAttached>,
    onOutput: AttachEventListener<AttachEventOutput>,
    onTerminate: AttachEventListener<AttachEventTerminate>,
  ): Promise<void> {
    return await this.overmindService.attach(
      request,
      {
        attached: onAttached,
        output: onOutput,
        terminate: onTerminate,
      },
      () => undefined,
      () => undefined,
    );
  }

  async terminateAttach(_event: AttachEventTerminate): Promise<void> {
    return;
  }

  async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    return await this.overmindService.startCerebrate(request);
  }

  async startCerebrateWorkflow(
    request: StartCerebrateWorkflowRequest,
  ): Promise<StartCerebrateWorkflowResponse> {
    return await this.overmindService.startCerebrateWorkflow(request);
  }

  async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    return await this.overmindService.stopCerebrate(request);
  }

  async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
    return await this.overmindService.sendCerebrateCommand(request);
  }

  private createConnectionApi(disconnectHandlers: Set<() => void>): OvermindIpcApi {
    const attachState: {
      resolveListen?: () => void;
      terminate?: (event: AttachEventTerminate) => Promise<void>;
    } = {};

    return {
      getStats: async (request) => await this.getStats(request),
      shutdown: async (request) => await this.shutdown(request),
      attach: async (request, onAttached, onOutput, onTerminate) => {
        if (attachState.resolveListen) {
          throw new Error('An attach stream is already active on this connection.');
        }

        await this.overmindService.attach(
          request,
          {
            attached: onAttached,
            output: onOutput,
            terminate: onTerminate,
          },
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
      terminateAttach: async (event) => {
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
      startCerebrate: async (request) => await this.startCerebrate(request),
      startCerebrateWorkflow: async (request) => await this.startCerebrateWorkflow(request),
      stopCerebrate: async (request) => await this.stopCerebrate(request),
      sendCerebrateCommand: async (request) => await this.sendCerebrateCommand(request),
    };
  }
}
