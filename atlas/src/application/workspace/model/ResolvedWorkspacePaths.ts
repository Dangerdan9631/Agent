/**
 * Holds canonical paths selected for one Atlas command invocation.
 */
export class ResolvedWorkspacePaths {
  /**
   * Creates resolved command paths after workspace, configuration, and artifact-root validation.
   *
   * @param workspaceRootPath - Absolute canonical workspace root directory.
   * @param configurationPath - Absolute configuration file path selected for the invocation.
   * @param artifactRootPath - Absolute artifact root path selected for generated output, when configuration has been loaded.
   */
  public constructor(
    public readonly workspaceRootPath: string,
    public readonly configurationPath: string,
    public readonly artifactRootPath: string | undefined
  ) {}
}
