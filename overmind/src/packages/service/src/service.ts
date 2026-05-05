import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  ShutdownRequest,
  ShutdownResponse,
} from 'overmind-api';

export class OvermindService implements OvermindApi {
  async getServiceStats(_request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    return {
      uptime: process.uptime(),
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
    return {
      success: true,
      message: 'Service shutdown requested.',
    };
  }
}