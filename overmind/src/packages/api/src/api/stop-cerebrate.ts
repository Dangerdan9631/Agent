export interface StopCerebrateRequest {
  name: string;
}

export interface StopCerebrateResponse {
  stopped: boolean;
  message: string;
}

export interface StopCerebrateError {
  errorMessage: string;
}
