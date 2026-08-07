/**
 * Generates portable Atlas models from one selected TypeScript workspace.
 */
export interface TypeScriptModelGenerationWorkflow {
  /**
   * Generates models using options supplied after the `generate` command.
   *
   * @param argumentsToForward Supported shared workspace and output options.
   * @returns Process-compatible completion status.
   */
  execute(argumentsToForward: readonly string[]): Promise<number>;
}
