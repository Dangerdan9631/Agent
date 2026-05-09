import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  ShutdownRequest,
  ShutdownResponse,
} from 'overmind-api';
import { inject, injectable } from 'tsyringe';
import { CerebrateController } from './cerebrate.controller.js';

@injectable()
export class ServiceController {
  constructor(@inject(CerebrateController) private readonly cerebrates: CerebrateController) {}

  async getServiceStats(_request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    const cerebrates = this.cerebrates.getRunningStats();

    return {
      uptime: process.uptime(),
      runningCerebrateCount: cerebrates.length,
      cerebrates,
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
    await this.cerebrates.stopAll();

    return {
      success: true,
      message: 'Service shutdown requested.',
    };
  }
}
