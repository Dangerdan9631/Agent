/**
 * Describes a requested project initialization.
 */
export interface InitCommandRequest {
  /**
   * Absolute project root selected by the command arguments.
   */
  readonly projectRoot: string;
}
