/** Client → server: subscribe to output for a named cerebrate. */
export interface AttachCerebrateIpcRequest {
  method: 'cerebrate.attach';
  params: AttachCerebrateParams;
}

export interface AttachCerebrateParams {
  name: string;
}

/** First server → client line after subscribe (same connection pattern as other RPC). */
export interface AttachCerebrateAckResponse {
  method: 'cerebrate.attach';
  ack: true;
}

/** Subsequent streaming lines while attached. */
export interface CerebrateAttachOutputEvent {
  type: 'output';
  line: string;
}
