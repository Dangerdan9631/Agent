/**
 * Describes whether the global CLI was installed from npm or a linked source tree.
 */
export type InstallSourceKind = 'remote' | 'local';

/**
 * Resolved install source metadata for global and project refresh operations.
 */
export interface InstallSource {
  /**
   * Whether the running global package is linked to a local source tree or installed remotely.
   */
  kind: InstallSourceKind;
  /**
   * Absolute path to the linked toolkit package root when `kind` is `local`.
   */
  sourcePath?: string;
  /**
   * Absolute path to the build-time marker file checked at runtime.
   */
  markerPath: string;
}

/**
 * Options for resolving install source from the running CLI layout.
 */
export interface ReadInstallSourceOptions {
  /**
   * Directory containing the built CLI entrypoint and marker file. Defaults to the running CLI directory.
   */
  cliDirectory?: string;
}
