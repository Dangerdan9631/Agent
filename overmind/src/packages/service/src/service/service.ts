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
import { singleton } from 'tsyringe';
import { CerebrateController, ServiceController } from '@overmind/controllers';

@singleton()
export class OvermindService implements OvermindApi {
  constructor(
    private readonly serviceController: ServiceController,
    private readonly cerebrateController: CerebrateController,
  ) {}

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
