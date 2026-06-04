
import net from 'node:net';

import {
  AttachChannel,
  AttachRequest,
  GetStatsRequest,
  GetStatsResponse,
  OvermindApi,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StartCerebrateWorkflowRequest,
  StartCerebrateWorkflowResponse,
  StartRequest,
  StartResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from "@overmind-sdk/api";
import type { OvermindConfigOptions } from '@overmind-sdk/config';
import { LoggerFactoryToken } from '@overmind-sdk/di/logger-factory-token';
import { OvermindConfigOptionsToken } from '@overmind-sdk/di/overmind-config-options-token';
import { AttachChannelAdapter } from '@overmind-sdk/ipc/attach-channel-adapter';
import { OvermindIpcClient } from "@overmind-sdk/ipc/overmind-ipc-client";
import type { Logger, LoggerFactory } from "@overmind-sdk/logging";
import { inject, injectable } from 'tsyringe';

import { ShutdownOperation } from "./shutdown";
import { StartOperation } from "./start";

@injectable()
export class OvermindApiHandler implements OvermindApi {
    private readonly logger: Logger;

    constructor(
      @inject(StartOperation) private readonly startOperation: StartOperation,
      @inject(ShutdownOperation) private readonly shutdownOperation: ShutdownOperation,
      @inject(OvermindIpcClient) private readonly overmindIpcClient: OvermindIpcClient,
      @inject(OvermindConfigOptionsToken) private readonly configOptions: OvermindConfigOptions,
      @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) {
      this.logger = loggerFactory.create('OvermindApi');
    }

    async start(request: StartRequest): Promise<StartResponse> {
      return await this.startOperation.execute(request);
    }

    async shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
      return await this.shutdownOperation.execute(request);
    }

    async getStats(request: GetStatsRequest): Promise<GetStatsResponse> {
      return await this.overmindIpcClient.getStats(request);
    }

    async attach(request: AttachRequest): Promise<AttachChannel> {
      const socket = net.createConnection(this.configOptions.pipePath);

      try {
        await new Promise<void>((resolve, reject) => {
          socket.once('connect', () => resolve());
          socket.once('error', reject);
        });
      } catch (error) {
        socket.destroy();
        throw error;
      }

      return new AttachChannelAdapter(request, socket);
    }

    async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
      return await this.overmindIpcClient.startCerebrate(request);
    }

    async startCerebrateWorkflow(
      request: StartCerebrateWorkflowRequest,
    ): Promise<StartCerebrateWorkflowResponse> {
      return await this.overmindIpcClient.startCerebrateWorkflow(request);
    }

    async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
      return await this.overmindIpcClient.stopCerebrate(request);
    }

    async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
      return await this.overmindIpcClient.sendCerebrateCommand(request);
    }
}
