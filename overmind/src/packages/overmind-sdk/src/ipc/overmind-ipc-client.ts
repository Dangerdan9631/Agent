import { once } from 'node:events';
import net from 'node:net';

import {
    GetStatsResponse,
    ShutdownResponse,
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

    async shutdown(): Promise<ShutdownResponse> {
        return await this.withRemoteApi((api) => api.shutdown({}));
    }

    async getStats(): Promise<GetStatsResponse> {
        return await this.withRemoteApi((api) => api.getStats({}));
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
