/**
 * Describes filesystem options for one TypeScript model-generation operation.
 */
export interface TypeScriptModelGenerationOptions {
  /** Optional workspace root; defaults to the current working directory. */
  readonly workspacePath?: string;
  /** Optional YAML policy path; defaults to atlas.config.yml in the workspace. */
  readonly configurationPath?: string;
  /** Optional artifact root overriding the YAML policy value. */
  readonly outputPath?: string;
}

/**
 * Generates portable Atlas models from one selected TypeScript workspace.
 */
export interface TypeScriptModelGenerationWorkflow {
  /**
   * Generates and persists models using the supplied workspace options.
   *
   * @param options Resolved command options owned by the CLI boundary.
   */
  execute(options: TypeScriptModelGenerationOptions): Promise<void>;
}
