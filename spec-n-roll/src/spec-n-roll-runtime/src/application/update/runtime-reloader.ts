/**
 * Requests that the current dispatcher launch a freshly resolved runtime in the same terminal.
 */
export interface RuntimeReloader {
  /**
   * Ends the current runtime using the dispatcher reload exit code.
   */
  reload(): void;
}
