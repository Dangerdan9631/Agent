export interface AttachCerebrateParams {
  name: string;
}

export interface AttachCerebrateAckResponse {
  method: 'cerebrate.attach';
  ack: true;
}

/** Subsequent streaming lines while attached. */
export interface CerebrateAttachOutputEvent {
  type: 'output';
  line: string;
}
