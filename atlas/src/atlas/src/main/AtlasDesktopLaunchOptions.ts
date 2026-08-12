/**
 * Carries validated workspace and local-listener selections for one desktop launch.
 */
export interface AtlasDesktopLaunchOptions {
  /** Optional workspace root override. */
  readonly workspacePath?: string | undefined;
  /** Optional Atlas configuration path override. */
  readonly configurationPath?: string | undefined;
  /** Optional artifact output path override. */
  readonly outputPath?: string | undefined;
  /** Optional local listener hostname. */
  readonly host?: string | undefined;
  /** Optional local listener port where zero requests an available port. */
  readonly port?: number | undefined;
}
