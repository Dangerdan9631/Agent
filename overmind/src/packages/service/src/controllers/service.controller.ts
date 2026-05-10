import type {
  GetServiceStatsError,
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindResponse,
  ShutdownError,
  ShutdownRequest,
  ShutdownResponse,
} from 'overmind-api';
import { inject, injectable } from 'tsyringe';
import { CerebrateController } from './cerebrate.controller.js';

@injectable()
export class ServiceController {
  constructor(@inject(CerebrateController) private readonly cerebrates: CerebrateController) {}

  async getServiceStats(_request: GetServiceStatsRequest): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>> {
    const cerebrates = this.cerebrates.getRunningStats();

    return {
      success: true,
      result: {
        uptime: process.uptime(),
        runningCerebrateCount: cerebrates.length,
        cerebrates,
      }
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<OvermindResponse<ShutdownResponse, ShutdownError>> {
    await this.cerebrates.stopAll();

    return {
      success: true,
      result: {
        success: true,
        message: 'Service shutdown requested.',
      }
    };
  }
}
