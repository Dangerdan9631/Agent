import type { GetServiceStatsRequest, GetServiceStatsResponse } from '../api/get-service-stats.js';
import type { ShutdownRequest, ShutdownResponse } from '../api/shutdown.js';
import type { SendCerebrateCommandRequest, SendCerebrateCommandResponse } from '../api/send-cerebrate-command.js';
import type { StartCerebrateRequest, StartCerebrateResponse } from '../api/start-cerebrate.js';
import type { StopCerebrateRequest, StopCerebrateResponse } from '../api/stop-cerebrate.js';
import type { AttachCerebrateIpcRequest, AttachCerebrateParams } from './attach-cerebrate.js';
import { GetServiceStatsIpcRequest, GetServiceStatsIpcResponse } from './get-service-stats.js';
import { SendCerebrateCommandIpcRequest, SendCerebrateCommandIpcResponse } from './send-cerebrate-command.js';
import { ShutdownIpcRequest, ShutdownIpcResponse } from './shutdown.js';
import { StartCerebrateIpcRequest, StartCerebrateIpcResponse } from './start-cerebrate.js';
import { StopCerebrateIpcRequest, StopCerebrateIpcResponse } from './stop-cerebrate.js';

export type OvermindApiMethod =
  | 'service.stats'
  | 'service.shutdown'
  | 'cerebrate.start'
  | 'cerebrate.stop'
  | 'cerebrate.command'
  | 'cerebrate.attach';

export type OvermindIpcRequest =
  | GetServiceStatsIpcRequest
  | ShutdownIpcRequest
  | StartCerebrateIpcRequest
  | StopCerebrateIpcRequest
  | SendCerebrateCommandIpcRequest
  | AttachCerebrateIpcRequest;

export type OvermindIpcResponse =
  | GetServiceStatsIpcResponse
  | ShutdownIpcResponse
  | StartCerebrateIpcResponse
  | StopCerebrateIpcResponse
  | SendCerebrateCommandIpcResponse;

export interface OvermindApiRequestMap {
  'service.stats': GetServiceStatsRequest;
  'service.shutdown': ShutdownRequest;
  'cerebrate.start': StartCerebrateRequest;
  'cerebrate.stop': StopCerebrateRequest;
  'cerebrate.command': SendCerebrateCommandRequest;
  'cerebrate.attach': AttachCerebrateParams;
}

export interface OvermindApiResponseMap {
  'service.stats': GetServiceStatsResponse;
  'service.shutdown': ShutdownResponse;
  'cerebrate.start': StartCerebrateResponse;
  'cerebrate.stop': StopCerebrateResponse;
  'cerebrate.command': SendCerebrateCommandResponse;
}
