export type MessageEnvelope<TMessageType, TMessage> = {
  method: TMessageType;
  message: TMessage;
};

export function createMessageEnvelope<TMessageType, TMessage>(method: TMessageType, message: TMessage): MessageEnvelope<TMessageType, TMessage> {
  return { method, message };
}

export function isMessageEnvelope<TMessageType>(method: TMessageType, obj: any): obj is MessageEnvelope<TMessageType, unknown> {
  return obj
    && typeof obj === 'object'
    && 'method' in obj
    && obj['method'] === method
    && 'message' in obj;
}