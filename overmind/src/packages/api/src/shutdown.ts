export type ShutdownRequest = {};

export interface ShutdownResponse {
    success: true;
    message: string;
};

export interface ShutdownError {
    errorMessage: string;
};
