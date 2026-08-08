/**
 * Regenerates presentation artifacts after the local viewer changes diagram policy.
 */
export interface ArtifactConfigurationChangeHandler {
  /**
   * Refreshes generated artifacts before the viewer reloads its current page.
   *
   * @returns A promise that resolves after all affected artifacts are current.
   */
  execute(): Promise<void>;
}
