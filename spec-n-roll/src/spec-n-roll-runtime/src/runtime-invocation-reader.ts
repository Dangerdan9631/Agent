/**
 * Reads raw invocation payloads from a runtime input stream.
 */
export interface RuntimeInvocationReader {
  /**
   * Reads the serialized dispatcher invocation payload.
   *
   * @returns UTF-8 JSON text supplied to stdin.
   */
  read(): string;
}
