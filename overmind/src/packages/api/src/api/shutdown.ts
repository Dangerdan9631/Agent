export type ShutdownRequest = Record<string, never>;

export interface ShutdownResponse {
    success: true;
    message: string;
}

export interface ShutdownError {
    errorMessage: string;
}
