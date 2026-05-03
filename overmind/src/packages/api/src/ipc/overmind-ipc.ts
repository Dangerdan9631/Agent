import type { GetServiceStatsRequest, GetServiceStatsResponse } from '../api/get-service-stats.js';
import type { ShutdownRequest, ShutdownResponse } from '../api/shutdown.js';

export type OvermindApiMethod =
  | 'service.stats'
  | 'service.shutdown';

export interface OvermindApiRequestMap {
  'service.stats': GetServiceStatsRequest;
  'service.shutdown': ShutdownRequest;
}

export interface OvermindApiResponseMap {
  'service.stats': GetServiceStatsResponse;
  'service.shutdown': ShutdownResponse;
}
