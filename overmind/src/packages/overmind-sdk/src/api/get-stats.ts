import { OvermindError } from "./overmind-api";

export type GetStatsRequest = {};

export interface CerebrateStats {
    name: string;
    idleLoopCount: number;
    runtime: number;
    state: 'initialize' | 'idle' | 'check-tasks' | 'post-check' | 'work' | 'validate' | 'shutting down';
};

export interface GetStatsResponse {
    uptime: number;
    runningCerebrateCount: number;
    cerebrates: CerebrateStats[];
};

export class GetStatsError extends OvermindError { }
