import { OvermindError } from "./overmind-api";

export type StartRequest = { };

export interface StartResponse {
    message: string;
};

export class StartError extends OvermindError { }
