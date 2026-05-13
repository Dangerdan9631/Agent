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
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { CerebrateController } from './cerebrate.controller.js';

@injectable()
export class ServiceController {
  private readonly logger: Logger;

  constructor(
    @inject(CerebrateController) private readonly cerebrates: CerebrateController,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('ServiceController');
  }

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
    this.logger.info('shutdown requested');
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
