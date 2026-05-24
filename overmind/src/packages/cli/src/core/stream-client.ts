import { StreamEventEnvelope } from "overmind-core";

export type StreamClient = {
    handleReceive(event: StreamEventEnvelope<unknown>): void;
    handleError(error: Error): void;
    unsubscribeAll(): void;
}