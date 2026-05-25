import { OvermindError, StreamErrorListener, StreamEventListener } from "./overmind-api";

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

export interface AttachChannel {
    onAttached(listener: StreamEventListener<AttachEventAttached>): () => void;
    onOutput(listener: StreamEventListener<AttachEventOutput>): () => void;
    onTerminate(listener: StreamEventListener<AttachEventTerminate>): () => void;
    onError(listener: StreamErrorListener): () => void;
    terminate(event: AttachEventTerminate): Promise<void>;
    listen(): Promise<void>;
};
