export interface IpcDisconnectedError {
    type: 'disconnected';
}

export function ipcDisconnectedError(): IpcDisconnectedError {
    return { type: 'disconnected' };
}

export function isIpcDisconnectedError(error: unknown): error is IpcDisconnectedError {
    return typeof error === 'object'
        && error !== null
        && 'type' in error
        && (error as any).type === 'disconnected';
}