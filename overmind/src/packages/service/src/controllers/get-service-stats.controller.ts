import type {
  GetServiceStatsError,
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindResponse,
} from 'overmind-api';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';
import { inject, injectable } from 'tsyringe';
import { CerebrateRuntime } from './cerebrate-runtime.js';

@injectable()
export class GetServiceStatsController {
  private readonly logger: Logger;

  constructor(
    private readonly runtime: CerebrateRuntime,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('GetServiceStatsController');
  }

  async execute(
    _request: GetServiceStatsRequest,
  ): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>> {
    const cerebrates = this.runtime.getRunningStats();
    this.logger.debug('reporting service stats', cerebrates.length);

    return {
      success: true,
      result: {
        uptime: process.uptime(),
        runningCerebrateCount: cerebrates.length,
        cerebrates,
      },
    };
  }
}