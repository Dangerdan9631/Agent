import { OvermindError } from "./overmind-api";

export interface StopCerebrateRequest {
    cerebrateName: string;
};

export interface StopCerebrateResponse {
    stopped: boolean;
    message: string;
};

export class StopCerebrateError extends OvermindError { }
