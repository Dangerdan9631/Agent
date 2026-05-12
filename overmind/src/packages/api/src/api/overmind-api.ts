import type { GetServiceStatsError, GetServiceStatsRequest, GetServiceStatsResponse } from './get-service-stats.js';
import type { ShutdownError, ShutdownRequest, ShutdownResponse } from './shutdown.js';
import type { SendCerebrateCommandError, SendCerebrateCommandRequest, SendCerebrateCommandResponse } from './send-cerebrate-command.js';
import type { StartCerebrateError, StartCerebrateRequest, StartCerebrateResponse } from './start-cerebrate.js';
import type { StopCerebrateError, StopCerebrateRequest, StopCerebrateResponse } from './stop-cerebrate.js';
import { AttachRequest, AttachError, AttachListener, AttachClient } from './attach.js';

export type OvermindResponse<TResponse, TError> =
  | { success: true; result: TResponse }
  | { success: false; error: TError };

export type OvermindStreamResponse<TClient, TError> =
  | { success: true; client: TClient }
  | { success: false; error: TError };

export interface OvermindApi {
  getServiceStats(request: GetServiceStatsRequest): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>>;
  shutdown(request: ShutdownRequest): Promise<OvermindResponse<ShutdownResponse, ShutdownError>>;

  attach(request: AttachRequest, listener: AttachListener): Promise<OvermindStreamResponse<AttachClient, AttachError>>;
  
  startCerebrate(request: StartCerebrateRequest): Promise<OvermindResponse<StartCerebrateResponse, StartCerebrateError>>;
  stopCerebrate(request: StopCerebrateRequest): Promise<OvermindResponse<StopCerebrateResponse, StopCerebrateError>>;
  sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>>;
}
