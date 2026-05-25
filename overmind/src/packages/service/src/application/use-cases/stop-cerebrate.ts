import type { StopCerebrateRequest, StopCerebrateResponse } from 'overmind-api';
import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

export class StopCerebrateUseCase {
  constructor(private readonly registry: CerebrateRegistry<Cerebrate>) {}

  async execute(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    const cerebrate = this.registry.remove(request.name);
    if (!cerebrate) {
      return {
        stopped: false,
        message: `Cerebrate not found: ${request.name}`,
      };
    }

    await cerebrate.stop();
    return {
      stopped: true,
      message: `Cerebrate stopped: ${request.name}`,
    };
  }
}
