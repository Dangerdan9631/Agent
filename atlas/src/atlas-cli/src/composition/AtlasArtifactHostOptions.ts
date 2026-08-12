/**
 * Selects the workspace, artifacts, and listener used by one hosted Atlas presentation.
 */
export interface AtlasArtifactHostOptions {
  /** Absolute current working directory of the invoking process. */
  readonly invocationDirectoryPath: string;
  /** Optional workspace root override. */
  readonly workspacePath?: string | undefined;
  /** Optional Atlas policy document override. */
  readonly configurationPath?: string | undefined;
  /** Optional generated artifact root override. */
  readonly outputPath?: string | undefined;
  /** Optional loopback listener host. */
  readonly host?: string | undefined;
  /** Optional TCP port where zero requests an available port. */
  readonly port?: number | undefined;
}
