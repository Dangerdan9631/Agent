import { IpcDisconnectedError, isIpcDisconnectedError } from './ipc-disconnected-error';
import { IpcRemoteError, isIpcRemoteError } from './ipc-remote-error';
import { IpcTimeoutError, isIpcTimeoutError } from './ipc-timeout-error';

export type IpcConnectionError =
    | IpcRemoteError
    | IpcTimeoutError
    | IpcDisconnectedError;

export function isIpcConnectionError(error: unknown): error is IpcConnectionError {
    return isIpcRemoteError(error)
        || isIpcTimeoutError(error)
        || isIpcDisconnectedError(error);
}