import type {
  OvermindResponse,
  StopCerebrateError,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-api';
import { injectable } from 'tsyringe';
import { CerebrateRuntime } from './cerebrate-runtime.js';

@injectable()
export class StopCerebrateController {
  constructor(
    private readonly runtime: CerebrateRuntime,
  ) {}

  async execute(
    request: StopCerebrateRequest,
  ): Promise<OvermindResponse<StopCerebrateResponse, StopCerebrateError>> {
    return this.runtime.stop(request);
  }
}