export interface IpcTimeoutError {
    type: 'timeout';
}

export function ipcTimeoutError(): IpcTimeoutError {
    return { type: 'timeout' };
}

export function isIpcTimeoutError(error: unknown): error is IpcTimeoutError {
    return typeof error === 'object'
        && error !== null
        && 'type' in error
        && (error as any).type === 'timeout';
}