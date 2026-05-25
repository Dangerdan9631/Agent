import { OvermindError } from "./overmind-api";

export type ShutdownRequest = {
    force?: boolean;
};

export interface ShutdownResponse {
    message: string;
};

export class ShutdownError extends OvermindError { }
