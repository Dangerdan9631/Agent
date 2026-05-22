export type MessageEnvelope<TMessageType> = {
  method: TMessageType;
  message: unknown;
};

export function createMessageEnvelope<TMessageType>(method: TMessageType, message: unknown): MessageEnvelope<TMessageType> {
  return { method, message };
}

export function isMessageEnvelope(obj: any): obj is MessageEnvelope<any> {
  return obj && typeof obj === 'object' && 'method' in obj && 'message' in obj;
}