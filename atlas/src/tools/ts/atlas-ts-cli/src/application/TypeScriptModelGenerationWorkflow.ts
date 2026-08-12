/**
 * Describes filesystem options for one TypeScript model-generation operation.
 */
export interface TypeScriptModelGenerationOptions {
  /** Optional npm package root; defaults to the current working directory. */
  readonly packagePath?: string;
  /** Optional package-relative tsconfig override. */
  readonly tsconfigPath?: string;
  /** Optional package-relative model output override. */
  readonly outputPath?: string;
}

/**
 * Generates one portable Atlas model from one selected TypeScript package.
 */
export interface TypeScriptModelGenerationWorkflow {
  /**
   * Generates and persists a model using the supplied package options.
   *
   * @param options Resolved command options owned by the CLI boundary.
   */
  execute(options: TypeScriptModelGenerationOptions): Promise<void>;
}
