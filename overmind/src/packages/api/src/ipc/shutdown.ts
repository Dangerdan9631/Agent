import type { ShutdownRequest, ShutdownResponse } from '../api/shutdown.js';

export interface ShutdownIpcRequest {
  method: 'service.shutdown';
  params: ShutdownRequest;
}

export interface ShutdownIpcResponse {
  method: 'service.shutdown';
  result: ShutdownResponse;
}