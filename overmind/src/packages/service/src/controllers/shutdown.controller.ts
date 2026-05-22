import type {
  OvermindResponse,
  ShutdownError,
  ShutdownRequest,
  ShutdownResponse,
} from 'overmind-api';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';
import { inject, injectable } from 'tsyringe';
import { CerebrateRuntime } from './cerebrate-runtime.js';

@injectable()
export class ShutdownController {
  private readonly logger: Logger;

  constructor(
    private readonly runtime: CerebrateRuntime,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('ShutdownController');
  }

  async execute(
    _request: ShutdownRequest,
  ): Promise<OvermindResponse<ShutdownResponse, ShutdownError>> {
    this.logger.info('shutdown requested');
    await this.runtime.stopAll();

    return {
      success: true,
      result: {
        success: true,
        message: 'Service shutdown requested.',
      },
    };
  }
}