import { OvermindError } from './overmind-error.js';

export interface SendCerebrateCommandRequest {
  name: string;
  command: string;
};

export interface SendCerebrateCommandResponse {
  output: string;
};

export class SendCerebrateCommandError extends OvermindError {}