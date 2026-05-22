import { OvermindStreamChannel } from './types';

export interface AttachRequest {
    name?: string | undefined;
    historyPlaybackSize?: number;
};

export interface AttachError {
    errorMessage: string;
};

export interface AttachEventAttached {
    name: string | undefined;
};

export interface AttachEventOutput {
    name: string | undefined;
    timestamp: number;
    data: string;
};

export interface AttachEventTerminate {
    name: string | undefined;
};

export interface AttachClientChannel extends OvermindStreamChannel {
    terminate: (event: AttachEventTerminate) => void;
    onAttached: (listener: (event: AttachEventAttached) => void) => void;
    onOutput: (listener: (event: AttachEventOutput) => void) => void;
    onTerminate: (listener: (event: AttachEventTerminate) => void) => void;
};

export interface AttachServerChannel extends OvermindStreamChannel{
    attached: (event: AttachEventAttached) => void;
    send: (event: AttachEventOutput) => void;
    terminate: (event: AttachEventTerminate) => void;
    onTerminate: (listener: (event: AttachEventTerminate) => void) => void;
};
