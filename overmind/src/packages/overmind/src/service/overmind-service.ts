import type {
    GetStatsRequest,
    GetStatsResponse,
    ShutdownRequest,
    ShutdownResponse,
} from 'overmind-sdk/api';
import { OvermindIpcApi } from 'overmind-sdk/ipc/overmind-ipc-api';
import { createConfigOptions } from 'overmind-sdk/config';
import { injectable } from "tsyringe";
import { OvermindIpcServer } from './overmind-ipc-server';

@injectable()
export class OvermindService implements OvermindIpcApi {
    private startedAt = 0;

    constructor(private readonly ipcServer: OvermindIpcServer) { }

    async run(argv: string[]): Promise<number> {
        const configOptions = createConfigOptions(argv[2]);
        this.startedAt = Date.now();

        try {
            await this.ipcServer.run(this, configOptions);
            return 0;
        } catch (error) {
            this.startedAt = 0;
            return 1;
        }

    }

    async getStats(_request: GetStatsRequest): Promise<GetStatsResponse> {
        return {
            uptime: this.startedAt === 0 ? 0 : (Date.now() - this.startedAt) / 1000,
            runningCerebrateCount: 0,
            cerebrates: [],
        };
    }

    async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
        this.ipcServer.stop();
        this.startedAt = 0;

        return { message: 'Overmind service is shutting down.' };
    }
};