/**
 * Carries validated workspace and local-listener selections for one desktop launch.
 */
export interface AtlasDesktopLaunchOptions {
  /**
   * Whether the desktop host exports every generated diagram image instead of opening the viewer.
   */
  readonly generateImages?: true | undefined;
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
