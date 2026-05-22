// ---

export type StreamEventEnvelope<TEventType> = {
  event: TEventType;
  data: unknown;
};

export function createStreamEventEnvelope<TEventType>(event: TEventType, data: unknown): StreamEventEnvelope<TEventType> {
  return { event, data };
}

export function isStreamEventEnvelope(obj: any): obj is StreamEventEnvelope<any> {
  return obj && typeof obj === 'object' && 'event' in obj && 'data' in obj;
}