import type { GetServiceStatsRequest, GetServiceStatsResponse } from 'overmind-api';
import type { Logger } from 'overmind-core';
import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

export class GetServiceStatsUseCase {
  constructor(
    private readonly registry: CerebrateRegistry<Cerebrate>,
    private readonly logger: Logger,
  ) {}

  async execute(_request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    const cerebrates = this.registry.values().map((cerebrate) => cerebrate.getStats());
    this.logger.debug('reporting service stats', cerebrates.length);

    return {
      uptime: process.uptime(),
      runningCerebrateCount: cerebrates.length,
      cerebrates,
    };
  }
}
