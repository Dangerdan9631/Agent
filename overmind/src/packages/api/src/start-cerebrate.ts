import { OvermindError } from './overmind-error.js';

export interface StartCerebrateRequest {
  name: string;
};

export interface StartCerebrateResponse {
  name: string;
};

export class StartCerebrateError extends OvermindError {}
