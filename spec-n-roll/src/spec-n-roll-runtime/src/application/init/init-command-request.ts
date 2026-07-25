/**
 * Describes a requested project initialization.
 */
export interface InitCommandRequest {
  /**
   * Absolute project root selected by the command arguments.
   */
  readonly projectRoot: string;
  /**
   * Built-in agent extension names selected for the new project.
   */
  readonly agents: readonly string[];
}
