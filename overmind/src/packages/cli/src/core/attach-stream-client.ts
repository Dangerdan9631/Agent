import {
    type AttachRequest,
    type AttachClientChannel,
    type AttachEventAttached,
    type AttachEventOutput,
    type AttachEventTerminate,
} from 'overmind-api';
import {
    type StreamEventEnvelope,
    EVENT_ATTACHED,
    EVENT_OUTPUT,
    EVENT_TERMINATE,
    createStreamEventEnvelope,
} from 'overmind-core';
import { StreamEventListeners } from './stream-event-listener';
import { StreamClient } from './stream-client';

export class AttachStreamClient implements AttachClientChannel, StreamClient {

    private readonly listeners = new StreamEventListeners();
    private readonly onAttachListener = this.listeners.createListener<AttachEventAttached>();
    private readonly onOutputListener = this.listeners.createListener<AttachEventOutput>();
    private readonly onTerminateListener = this.listeners.createListener<AttachEventTerminate>();
    private readonly onErrorListener = this.listeners.createListener<Error>();

    constructor(
        private readonly message: AttachRequest,
        private readonly sendMessage: (message: unknown) => void) { }
    
    terminate(event: AttachEventTerminate): void {
        const envelope = createStreamEventEnvelope(EVENT_TERMINATE, event);
        this.sendMessage(JSON.stringify(envelope));
    }

    onAttached(listener: (event: AttachEventAttached) => void): void {
        this.onAttachListener.subscribe(listener);
    }

    onOutput(listener: (event: AttachEventOutput) => void): void {
        this.onOutputListener.subscribe(listener);
    }

    onTerminate(listener: (event: AttachEventTerminate) => void): void {
        this.onTerminateListener.subscribe(listener);
    }

    onError(listener: (error: Error) => void): void {
        this.onErrorListener.subscribe(listener);
    }
    
    async listen(): Promise<void> {
        this.sendMessage(this.message);
    }

    handleReceive(event: StreamEventEnvelope<unknown>): void {
        switch (event.event) {
            case EVENT_ATTACHED:
                this.onAttachListener.send(event.data as AttachEventAttached);
                return;
            case EVENT_OUTPUT:
                this.onOutputListener.send(event.data as AttachEventOutput);
                return;
            case EVENT_TERMINATE:
                this.onTerminateListener.send(event.data as AttachEventTerminate);
                return;
            default:
                throw new Error('Unknown attach event received');
        }
    }

    handleError(error: Error): void {
        this.onErrorListener.send(error);
    }

    unsubscribeAll(): void {
        this.listeners.unsubscribeAll();
    }
}
