/**
 * Resolves the package manifest path for a runtime installed with the dispatcher.
 */
export interface RuntimePackageManifestPathResolver {
  /**
   * Resolves the runtime package manifest from a dispatcher install directory.
   *
   * @param dispatcherInstallDirectory - Directory containing the running dispatcher entry file.
   * @returns Absolute path to the installed runtime package manifest.
   */
  resolve(dispatcherInstallDirectory: string): string;
}
