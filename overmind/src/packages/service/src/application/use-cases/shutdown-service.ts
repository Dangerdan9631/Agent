import type { ShutdownRequest, ShutdownResponse } from 'overmind-api';
import type { Logger } from 'overmind-core';

import { StopAllCerebratesUseCase } from './stop-all-cerebrates.js';

export class ShutdownServiceUseCase {
  constructor(
    private readonly stopAllCerebrates: StopAllCerebratesUseCase,
    private readonly logger: Logger,
  ) {}

  async execute(_request: ShutdownRequest): Promise<ShutdownResponse> {
    this.logger.info('shutdown requested');
    await this.stopAllCerebrates.execute();

    return {
      message: 'Service shutdown requested.',
    };
  }
}
