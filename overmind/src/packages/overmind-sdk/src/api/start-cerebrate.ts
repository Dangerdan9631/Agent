import { OvermindError } from "./overmind-api";

export interface StartCerebrateRequest {
    name: string;
};

export interface StartCerebrateResponse {
    name: string;
};

export class StartCerebrateError extends OvermindError { }
