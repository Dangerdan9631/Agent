import type { SendCerebrateCommandRequest, SendCerebrateCommandResponse } from 'overmind-sdk/api';
import { SendCerebrateCommandError } from 'overmind-sdk/api';

import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

export class SendCerebrateCommandUseCase {
  constructor(private readonly registry: CerebrateRegistry<Cerebrate>) {}

  async execute(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
    const cerebrate = this.registry.get(request.cerebrateName);
    if (!cerebrate) {
      throw new SendCerebrateCommandError(`Cerebrate "${request.cerebrateName}" is not running.`);
    }

    const output = await cerebrate.sendCommand(request.command);
    return { output };
  }
}
