
export type OvermindErrorResponse<T> = {
  success: false;
  error: T;
};

export function createErrorResponse<T>(error: T): OvermindErrorResponse<T> {
  return { success: false, error };
};

export function isOvermindErrorResponse<T>(obj: any): obj is OvermindErrorResponse<T> {
  return obj && typeof obj === 'object' && 'success' in obj && obj.success === false && 'error' in obj;
};

// -----------------------------------------------------------------------------

export type OvermindSuccessResponse<T> = {
  success: true;
  result: T;
};

export function createSuccessResponse<T>(result: T): OvermindSuccessResponse<T> {
  return { success: true, result };
};

export function isOvermindSuccessResponse<T>(obj: any): obj is OvermindSuccessResponse<T> {
  return obj && typeof obj === 'object' && 'success' in obj && obj.success === true && 'result' in obj;
};

export type OvermindResponse<TResponse, TError> =
  | OvermindSuccessResponse<TResponse>
  | OvermindErrorResponse<TError>;

export function isOvermindResponse<TResponse, TError>(obj: any): obj is OvermindResponse<TResponse, TError> {
  return isOvermindSuccessResponse<TResponse>(obj) || isOvermindErrorResponse<TError>(obj);
};

// -----------------------------------------------------------------------------

export type OvermindStreamConnectedResponse<T> = {
  success: true;
  client: T;
};

export function createStreamConnectedResponse<T>(client: T): OvermindStreamConnectedResponse<T> {
  return { success: true, client };
};

export function isOvermindStreamConnectedResponse<T>(obj: any): obj is OvermindStreamConnectedResponse<T> {
  return obj && typeof obj === 'object' && 'success' in obj && obj.success === true && 'client' in obj;
};

export type OvermindStreamResponse<TClient, TError> =
  | OvermindStreamConnectedResponse<TClient>
  | OvermindErrorResponse<TError>;

export function isOvermindStreamResponse<TClient, TError>(obj: any): obj is OvermindStreamResponse<TClient, TError> {
  return isOvermindStreamConnectedResponse<TClient>(obj) || isOvermindErrorResponse<TError>(obj);
};

// -----------------------------------------------------------------------------

export interface OvermindStreamChannel {
  onError: (error: Error) => void;
  listen: () => Promise<void>;
};
