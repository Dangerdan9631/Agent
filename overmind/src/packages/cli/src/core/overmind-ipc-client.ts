import type net from 'node:net';

import {
    type AttachClient,
    AttachRequest,
    GetServiceStatsRequest,
    GetServiceStatsResponse,
    OvermindApi,
    OvermindRpcApi,
    SendCerebrateCommandRequest,
    SendCerebrateCommandResponse,
    ShutdownRequest,
    ShutdownResponse,
    StartCerebrateRequest,
    StartCerebrateResponse,
    StopCerebrateRequest,
    StopCerebrateResponse,
} from 'overmind-api';
import {
    closeRpcSocket,
    connectRpcSocket,
    createRpcChannel,
    type Logger,
    type LoggerFactory
} from 'overmind-core';

import { AttachStreamClient } from './attach-client.js';

export class OvermindIpcClient implements OvermindApi {
    private readonly logger: Logger;

    constructor(
        private readonly pipePath: string,
        loggerFactory: LoggerFactory
    ) {
        this.logger = loggerFactory.create('OvermindIpcClient');
    }

    async getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
        return await this.withRemoteApi((api) => api.getServiceStats(request));
    }

    async shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
        return await this.withRemoteApi((api) => api.shutdown(request));
    }

    async attach(request: AttachRequest): Promise<AttachClient> {
        const socket = await connectRpcSocket(this.pipePath);

        const api = createRpcChannel<Record<string, never>, OvermindRpcApi>(socket).getAPI();
        return new AttachStreamClient(request, api, socket, () => closeRpcSocket(socket));
    }

    async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
        return await this.withRemoteApi((api) => api.startCerebrate(request));
    }

    async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
        return await this.withRemoteApi((api) => api.stopCerebrate(request));
    }

    async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
        return await this.withRemoteApi((api) => api.sendCerebrateCommand(request));
    }

    private async withRemoteApi<TResponse>(action: (api: OvermindRpcApi) => Promise<TResponse>): Promise<TResponse> {
        const socket = await connectRpcSocket(this.pipePath);

        try {
            const api = this.createRemoteApi(socket);
            return await action(api);
        } finally {
            await closeRpcSocket(socket);
        }
    }

    private createRemoteApi(socket: net.Socket): OvermindRpcApi {
        return createRpcChannel<Record<string, never>, OvermindRpcApi>(socket).getAPI();
    }
}
