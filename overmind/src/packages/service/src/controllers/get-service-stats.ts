import type { GetServiceStatsRequest, GetServiceStatsResponse, OvermindApi } from 'overmind-api';

export async function getServiceStatsController(
  service: OvermindApi,
  params: unknown,
): Promise<GetServiceStatsResponse> {
  return service.getServiceStats((params ?? {}) as GetServiceStatsRequest);
}