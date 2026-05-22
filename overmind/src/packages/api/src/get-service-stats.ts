export type GetServiceStatsRequest = {};

export interface CerebrateStats {
  name: string;
  idleLoopCount: number;
  runtime: number;
  state: 'initialize' | 'idle' | 'check-tasks' | 'post-check' | 'work' | 'validate' | 'shutting down';
};

export interface GetServiceStatsResponse {
  uptime: number;
  runningCerebrateCount: number;
  cerebrates: CerebrateStats[];
};

export interface GetServiceStatsError {
  errorMessage: string;
};
