import type { DispatcherInstallSource } from '#api/contracts/dispatcher/dispatcher-install-source.js';

/**
 * Describes dispatcher package metadata sent to the selected CLI runtime.
 */
export interface DispatcherMetadata {
  /**
   * Install source detected from the dispatcher build marker. Must be either
   * `remote` for npm installs or `local` for linked development builds.
   */
  readonly installSource: DispatcherInstallSource;

  /**
   * Absolute package root for the running dispatcher install. Must be the
   * directory containing the dispatcher package.json.
   */
  readonly installDirectory: string;

  /**
   * Dispatcher package version read from package.json. Must be a non-empty
   * semantic version string when package metadata is available.
   */
  readonly packageVersion: string;
}
