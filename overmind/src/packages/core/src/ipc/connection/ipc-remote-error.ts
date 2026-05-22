export interface IpcRemoteError {
    type: 'remote_error';
    message: string;
    error?: Error;
}

export function ipcRemoteError(message: string, error?: Error): IpcRemoteError {
    return { type: 'remote_error', message, error };
}

export function isIpcRemoteError(error: unknown): error is IpcRemoteError {
    return typeof error === 'object'
        && error !== null
        && 'type' in error
        && (error as any).type === 'remote_error';
}