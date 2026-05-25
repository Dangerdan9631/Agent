import { OvermindError } from './overmind-error.js';

export interface StopCerebrateRequest {
  name: string;
};

export interface StopCerebrateResponse {
  stopped: boolean;
  message: string;
};

export class StopCerebrateError extends OvermindError {}
