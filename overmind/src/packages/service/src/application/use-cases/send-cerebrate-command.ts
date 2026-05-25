import type { SendCerebrateCommandRequest, SendCerebrateCommandResponse } from 'overmind-api';
import { SendCerebrateCommandError } from 'overmind-api';

import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

export class SendCerebrateCommandUseCase {
  constructor(private readonly registry: CerebrateRegistry<Cerebrate>) {}

  async execute(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
    const cerebrate = this.registry.get(request.name);
    if (!cerebrate) {
      throw new SendCerebrateCommandError(`Cerebrate "${request.name}" is not running.`);
    }

    const output = await cerebrate.sendCommand(request.command);
    return { output };
  }
}
