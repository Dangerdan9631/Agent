import { OvermindError } from "./overmind-error";

export type ShutdownRequest = {
    force?: boolean;
};

export interface ShutdownResponse {
    message: string;
};

export class ShutdownError extends OvermindError { }
