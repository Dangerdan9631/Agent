import { OvermindError } from "./overmind-error";

export interface StartRequest { };

export interface StartResponse {
    message: string;
};

export class StartError extends OvermindError { }
