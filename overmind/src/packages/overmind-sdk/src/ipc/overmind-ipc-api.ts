import { ShutdownRequest, ShutdownResponse, GetStatsRequest, GetStatsResponse } from '@overmind-sdk/api';

export interface OvermindIpcApi {
    shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;
    getStats(request: GetStatsRequest): Promise<GetStatsResponse>;
}
