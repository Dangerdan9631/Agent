export type GetServiceStatsRequest = Record<string, never>;

export interface CerebrateStats {
    id: string;
    idleLoopCount: number;
    runtime: number;
    state: 'initialize' | 'idle' | 'shutting down';
}

export interface GetServiceStatsResponse {
    uptime: number;
    runningCerebrateCount: number;
    cerebrates: CerebrateStats[];
}
