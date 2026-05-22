import type {
  OvermindResponse,
  SendCerebrateCommandError,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
} from 'overmind-api';
import { injectable } from 'tsyringe';
import { CerebrateRuntime } from './cerebrate-runtime.js';

@injectable()
export class SendCerebrateCommandController {
  constructor(
    private readonly runtime: CerebrateRuntime,
  ) {}

  async execute(
    request: SendCerebrateCommandRequest,
  ): Promise<OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>> {
    return this.runtime.sendCommand(request);
  }
}