import type { SendCerebrateCommandRequest, SendCerebrateCommandResponse } from '../api/send-cerebrate-command.js';

export interface SendCerebrateCommandIpcRequest {
  method: 'cerebrate.command';
  params: SendCerebrateCommandRequest;
}

export interface SendCerebrateCommandIpcResponse {
  method: 'cerebrate.command';
  result: SendCerebrateCommandResponse;
}
