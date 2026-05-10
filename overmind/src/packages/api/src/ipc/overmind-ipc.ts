import type { GetServiceStatsError, GetServiceStatsRequest, GetServiceStatsResponse } from '../api/get-service-stats.js';
import type { ShutdownError, ShutdownRequest, ShutdownResponse } from '../api/shutdown.js';
import type { SendCerebrateCommandError, SendCerebrateCommandRequest, SendCerebrateCommandResponse } from '../api/send-cerebrate-command.js';
import type { StartCerebrateError, StartCerebrateRequest, StartCerebrateResponse } from '../api/start-cerebrate.js';
import type { StopCerebrateError, StopCerebrateRequest, StopCerebrateResponse } from '../api/stop-cerebrate.js';
import type { OvermindResponse } from '../api/overmind-api.js';
import type { AttachCerebrateParams } from './attach-cerebrate.js';

export type OvermindApiMethod =
  | 'service.stats'
  | 'service.shutdown'
  | 'cerebrate.start'
  | 'cerebrate.stop'
  | 'cerebrate.command';

export interface OvermindApiRequestMap {
  'service.stats': GetServiceStatsRequest;
  'service.shutdown': ShutdownRequest;
  'cerebrate.start': StartCerebrateRequest;
  'cerebrate.stop': StopCerebrateRequest;
  'cerebrate.command': SendCerebrateCommandRequest;
}

export interface OvermindApiResponseMap {
  'service.stats': GetServiceStatsResponse;
  'service.shutdown': ShutdownResponse;
  'cerebrate.start': StartCerebrateResponse;
  'cerebrate.stop': StopCerebrateResponse;
  'cerebrate.command': SendCerebrateCommandResponse;
}

export interface OvermindApiErrorMap {
  'service.stats': GetServiceStatsError;
  'service.shutdown': ShutdownError;
  'cerebrate.start': StartCerebrateError;
  'cerebrate.stop': StopCerebrateError;
  'cerebrate.command': SendCerebrateCommandError;
}

export type OvermindIpcRequest =
  | { [M in OvermindApiMethod]: { method: M; params: OvermindApiRequestMap[M] } }[OvermindApiMethod]
  | { method: 'cerebrate.attach'; params: AttachCerebrateParams };

export type OvermindIpcResponse = {
  [M in OvermindApiMethod]: { method: M; result: OvermindResponse<OvermindApiResponseMap[M], OvermindApiErrorMap[M]> }
}[OvermindApiMethod];

export interface OvermindIpcErrorResponse {
  method: string;
  error: string;
}