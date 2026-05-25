import { OvermindError } from "./overmind-error";

export interface StartCerebrateRequest {
    name: string;
};

export interface StartCerebrateResponse {
    name: string;
};

export class StartCerebrateError extends OvermindError { }
