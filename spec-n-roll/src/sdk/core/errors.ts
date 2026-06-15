/**
 * Error thrown when a core-library mutation is rejected with optional remediation guidance.
 */
export class CoreMutationError extends Error {
  /** Machine-readable error code for callers and tests. */
  readonly code: string;
  /** Optional remediation steps shown to developers and agents. */
  readonly remediation?: string;

  /**
   * Creates a core mutation error with a stable code and optional remediation text.
   *
   * @param code - Stable error identifier (e.g. `TASK_SPEC_LOCKED`).
   * @param message - Human-readable explanation of the failure.
   * @param remediation - Optional guidance for resolving the error.
   */
  constructor(code: string, message: string, remediation?: string) {
    super(remediation != null ? `${message} ${remediation}` : message);
    this.name = 'CoreMutationError';
    this.code = code;
    this.remediation = remediation;
  }
}
