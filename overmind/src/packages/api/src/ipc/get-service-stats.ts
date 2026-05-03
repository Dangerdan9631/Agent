import type { GetServiceStatsRequest, GetServiceStatsResponse } from '../api/get-service-stats.js';

export interface GetServiceStatsIpcRequest {
  method: 'service.stats';
  params: GetServiceStatsRequest;
}

export interface GetServiceStatsIpcResponse {
  method: 'service.stats';
  result: GetServiceStatsResponse;
}