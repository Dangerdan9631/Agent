export interface SendCerebrateCommandRequest {
  name: string;
  command: string;
}

export interface SendCerebrateCommandResponse {
  output: string;
}

export interface SendCerebrateCommandError {
  errorMessage: string;
}