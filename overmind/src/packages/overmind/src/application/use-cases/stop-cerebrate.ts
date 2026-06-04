import type { StopCerebrateRequest, StopCerebrateResponse } from 'overmind-sdk/api';

import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

export class StopCerebrateUseCase {
  constructor(private readonly registry: CerebrateRegistry<Cerebrate>) {}

  async execute(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    const cerebrate = this.registry.remove(request.cerebrateName);
    if (!cerebrate) {
      return {
        stopped: false,
        message: `Cerebrate not found: ${request.cerebrateName}`,
      };
    }

    await cerebrate.stop();
    return {
      stopped: true,
      message: `Cerebrate stopped: ${request.cerebrateName}`,
    };
  }
}
