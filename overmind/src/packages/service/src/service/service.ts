import type {
  OvermindIpcRequest,
  OvermindIpcResponse,
} from 'overmind-api';
import { inject, singleton } from 'tsyringe';
import { CerebrateController, ServiceController } from '@overmind/controllers';
import { OvermindIpcServer } from './ipc-server';
import { type OvermindConfig, OvermindConfigToken } from '@overmind/config';

@singleton()
export class OvermindService {
  constructor(
    @inject(OvermindConfigToken) private readonly config: OvermindConfig,
    private readonly ipcServer: OvermindIpcServer,
    private readonly serviceController: ServiceController,
    private readonly cerebrateController: CerebrateController,
  ) {  }
  
  async start(): Promise<void> {
    await this.ipcServer.listen(
      this.config,
      (async (request: Exclude<OvermindIpcRequest, { method: 'cerebrate.attach' }>): Promise<OvermindIpcResponse> => {
        switch (request.method) {
          case 'service.stats':
            return {
              method: request.method,
              result: await this.serviceController.getServiceStats(request.params),
            };
          case 'service.shutdown':
            return {
              method: request.method,
              result: await this.serviceController.shutdown(request.params),
            };
          case 'cerebrate.start':
            return {
              method: request.method,
              result: await this.cerebrateController.startCerebrate(request.params),
            };
          case 'cerebrate.stop':
            return {
              method: request.method,
              result: await this.cerebrateController.stopCerebrate(request.params),
            };
          case 'cerebrate.command':
            return {
              method: request.method,
              result: await this.cerebrateController.sendCerebrateCommand(request.params),
            };
          default:
            throw new Error(`Unsupported method: ${(request as { method: string }).method}`);
        }
      }),
      this.cerebrateController.subscribeCerebrateOutput.bind(this.cerebrateController),
    );
  }
}
