import type { GetServiceStatsRequest, GetServiceStatsResponse } from './get-service-stats.js';
import type { ShutdownRequest, ShutdownResponse } from './shutdown.js';
import type { SendCerebrateCommandRequest, SendCerebrateCommandResponse } from './send-cerebrate-command.js';
import type { StartCerebrateRequest, StartCerebrateResponse } from './start-cerebrate.js';
import type { StopCerebrateRequest, StopCerebrateResponse, } from './stop-cerebrate.js';
import type { AttachClient, AttachEventTerminate, AttachRequest, AttachServerEventSink } from './attach.js';

export interface OvermindApi {
  getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse>;
  shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;

  attach(request: AttachRequest): Promise<AttachClient>;
  
  startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse>;
  stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse>;
  sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse>;
};

export interface OvermindRpcApi {
  getServiceStats(request: GetServiceStatsRequest): Promise<GetServiceStatsResponse>;
  shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;

  attach(request: AttachRequest, events: AttachServerEventSink): Promise<void>;
  terminateAttach(event: AttachEventTerminate): Promise<void>;

  startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse>;
  stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse>;
  sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse>;
};
