import { once } from 'node:events';
import net from 'node:net';

import {
    AttachEventTerminate,
    AttachRequest,
    AttachServerEventSink,
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
} from '@overmind-sdk/api';
import type { OvermindConfigOptions } from '@overmind-sdk/config';
import { OvermindConfigOptionsToken } from '@overmind-sdk/di/overmind-config-options-token';
import { NodeIo, RPCChannel } from 'kkrpc';
import { inject, injectable } from 'tsyringe';

import { OvermindIpcApi } from './overmind-ipc-api';

@injectable()
export class OvermindIpcClient {
    constructor(
        @inject(OvermindConfigOptionsToken) private readonly configOptions: OvermindConfigOptions
    ) { }

    async shutdown(request: ShutdownRequest = {}): Promise<ShutdownResponse> {
        return await this.withRemoteApi((api) => api.shutdown(request));
    }

    async getStats(request: GetStatsRequest = {}): Promise<GetStatsResponse> {
        return await this.withRemoteApi((api) => api.getStats(request));
    }

    async attach(request: AttachRequest, events: AttachServerEventSink): Promise<void> {
        return await this.withRemoteApi((api) => api.attach(
          request,
          events.attached,
          events.output,
          events.terminate,
        ));
    }

    async terminateAttach(event: AttachEventTerminate): Promise<void> {
        return await this.withRemoteApi((api) => api.terminateAttach(event));
    }

    async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
        return await this.withRemoteApi((api) => api.startCerebrate(request));
    }

    async startCerebrateWorkflow(
        request: StartCerebrateWorkflowRequest,
    ): Promise<StartCerebrateWorkflowResponse> {
        return await this.withRemoteApi((api) => api.startCerebrateWorkflow(request));
    }

    async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
        return await this.withRemoteApi((api) => api.stopCerebrate(request));
    }

    async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
        return await this.withRemoteApi((api) => api.sendCerebrateCommand(request));
    }

    private async withRemoteApi<TResponse>(
        action: (api: OvermindIpcApi) => Promise<TResponse>): Promise<TResponse> {
        const socket = net.createConnection(this.configOptions.pipePath);
        
        try {
            await once(socket, 'connect');
        } catch (error) {
            socket.destroy();
            throw error;
        }

        try {
            const io = new NodeIo(socket, socket);
            const api = new RPCChannel<Record<string, never>, OvermindIpcApi>(io).getAPI();
            return await action(api);
        } finally {
            if (!socket.destroyed) {
                socket.end();

                if (!socket.destroyed) {
                    await once(socket, 'close');
                }
            }
        }
    }
}
