import type { StopCerebrateRequest, StopCerebrateResponse } from '../api/stop-cerebrate.js';

export interface StopCerebrateIpcRequest {
  method: 'cerebrate.stop';
  params: StopCerebrateRequest;
}

export interface StopCerebrateIpcResponse {
  method: 'cerebrate.stop';
  result: StopCerebrateResponse;
}
