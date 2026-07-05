/**
 * Runs executable behavior after commander has parsed process arguments.
 */
export interface CommandRunner {
  /**
   * Executes the command action and writes any user-facing output.
   */
  run(): void;
}
