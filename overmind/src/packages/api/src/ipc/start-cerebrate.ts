import type { StartCerebrateRequest, StartCerebrateResponse } from '../api/start-cerebrate.js';

export interface StartCerebrateIpcRequest {
  method: 'cerebrate.start';
  params: StartCerebrateRequest;
}

export interface StartCerebrateIpcResponse {
  method: 'cerebrate.start';
  result: StartCerebrateResponse;
}
