import type { GetServiceStatsRequest, GetServiceStatsResponse } from './get-service-stats.js';
import type { ShutdownRequest, ShutdownResponse } from './shutdown.js';
import type { StartCerebrateRequest, StartCerebrateResponse } from './start-cerebrate.js';
import type { StopCerebrateRequest, StopCerebrateResponse } from './stop-cerebrate.js';

export interface OvermindApi {
  getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse>;
  shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;
  startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse>;
  stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse>;
}
