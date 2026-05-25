import { OvermindError } from "./overmind-api";

export interface StartRequest { };

export interface StartResponse {
    message: string;
};

export class StartError extends OvermindError { }
