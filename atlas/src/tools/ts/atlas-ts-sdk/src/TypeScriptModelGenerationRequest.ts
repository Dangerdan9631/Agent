/**
 * Describes one process-independent TypeScript workspace model-generation request.
 */
export interface TypeScriptModelGenerationRequest {
  /** Absolute workspace root containing selected npm packages and TypeScript source. */
  readonly workspacePath: string;

  /** Package root paths relative to the workspace root. */
  readonly packagePaths: readonly string[];
}
