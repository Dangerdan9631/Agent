import { OvermindError } from './overmind-error.js';

export type ShutdownRequest = {};

export interface ShutdownResponse {
    message: string;
};

export class ShutdownError extends OvermindError {}
