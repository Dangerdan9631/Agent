/**
 * Describes whether a framework update action may be started.
 */
export interface ProjectFrameworkUpdateAvailability {
  /**
   * True when the action may be selected.
   */
  readonly enabled: boolean;

  /**
   * Human-readable reason when the action cannot be selected.
   */
  readonly disabledReason?: string;
}
