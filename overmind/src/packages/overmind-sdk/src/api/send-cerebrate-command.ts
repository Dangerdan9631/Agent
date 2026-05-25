import { OvermindError } from "./overmind-api";

export interface SendCerebrateCommandRequest {
    cerebrateName: string;
    command: string;
};

export interface SendCerebrateCommandResponse {
    output: string;
};

export class SendCerebrateCommandError extends OvermindError { }