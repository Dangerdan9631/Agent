import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-api';
import { inject, singleton } from 'tsyringe';
import { CerebrateController } from './controllers/cerebrate.controller.js';
import { ServiceController } from './controllers/service.controller.js';
import type { OvermindConfig } from './config/overmind-config.js';
import { OvermindConfigToken } from './container.js';

@singleton()
export class OvermindService implements OvermindApi {
  constructor(
    @inject(OvermindConfigToken) private readonly config: OvermindConfig,
    @inject(ServiceController) private readonly serviceController: ServiceController,
    @inject(CerebrateController) private readonly cerebrateController: CerebrateController,
  ) {}

  get configDir(): string {
    return this.config.configDir;
  }

  getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    return this.serviceController.getServiceStats(request);
  }

  shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
    return this.serviceController.shutdown(request);
  }

  startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    return this.cerebrateController.startCerebrate(request);
  }

  stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    return this.cerebrateController.stopCerebrate(request);
  }

  sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
    return this.cerebrateController.sendCerebrateCommand(request);
  }

  subscribeCerebrateOutput(name: string, listener: (line: string) => void): () => void {
    return this.cerebrateController.subscribeCerebrateOutput(name, listener);
  }
}
