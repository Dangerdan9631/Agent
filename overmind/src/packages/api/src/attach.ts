import { OvermindError } from './overmind-error.js';

export interface AttachRequest {
    name?: string | undefined;
    historyPlaybackSize?: number;
};

export class AttachError extends OvermindError { }

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

export type AttachEventListener<TEvent> = (event: TEvent) => void | Promise<void>;
export type AttachErrorListener = (error: Error) => void | Promise<void>;

export interface AttachServerEventSink {
    attached: (event: AttachEventAttached) => void | Promise<void>;
    output: (event: AttachEventOutput) => void | Promise<void>;
    terminate: (event: AttachEventTerminate) => void | Promise<void>;
};

export interface AttachClient {
    onAttached(listener: AttachEventListener<AttachEventAttached>): () => void;
    onOutput(listener: AttachEventListener<AttachEventOutput>): () => void;
    onTerminate(listener: AttachEventListener<AttachEventTerminate>): () => void;
    onError(listener: AttachErrorListener): () => void;
    terminate(event: AttachEventTerminate): Promise<void>;
    listen(): Promise<void>;
};
