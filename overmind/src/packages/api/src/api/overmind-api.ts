import type { GetServiceStatsRequest, GetServiceStatsResponse } from './get-service-stats.js';
import type { ShutdownRequest, ShutdownResponse } from './shutdown.js';

export interface OvermindApi {
  getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse>;
  shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;
}