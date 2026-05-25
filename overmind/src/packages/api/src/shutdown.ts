import { OvermindError } from './overmind-error.js';

export interface ShutdownRequest {};

export interface ShutdownResponse {
    message: string;
};

export class ShutdownError extends OvermindError {}
