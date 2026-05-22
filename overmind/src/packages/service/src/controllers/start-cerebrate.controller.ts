import type {
  OvermindResponse,
  StartCerebrateError,
  StartCerebrateRequest,
  StartCerebrateResponse,
} from 'overmind-api';
import { injectable } from 'tsyringe';
import { CerebrateRuntime } from './cerebrate-runtime.js';

@injectable()
export class StartCerebrateController {
  constructor(
    private readonly runtime: CerebrateRuntime,
  ) {}

  async execute(
    request: StartCerebrateRequest,
  ): Promise<OvermindResponse<StartCerebrateResponse, StartCerebrateError>> {
    return this.runtime.start(request);
  }
}