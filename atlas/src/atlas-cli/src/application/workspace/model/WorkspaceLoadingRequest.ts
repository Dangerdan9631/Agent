/**
 * Carries path options received by one Atlas command invocation.
 */
export interface WorkspaceLoadingRequest {
  /**
   * Identifies the absolute current working directory of the Atlas process.
   */
  readonly invocationDirectoryPath: string;

  /**
   * Optionally overrides the workspace root path.
   */
  readonly workspaceOption: string | undefined;

  /**
   * Optionally overrides the canonical configuration file path.
   */
  readonly configurationOption: string | undefined;

  /**
   * Optionally overrides the configured artifact output root.
   */
  readonly outputOption: string | undefined;
}
