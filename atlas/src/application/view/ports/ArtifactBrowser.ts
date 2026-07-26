/**
 * Opens a local Atlas artifact URL in the user's default browser.
 */
export interface ArtifactBrowser {
  /**
   * Requests opening one validated local HTTP URL without waiting for a browser process to exit.
   *
   * @param url - Absolute local Atlas artifact URL.
   * @returns A promise that resolves once the operating system accepts the launch request.
   */
  open(url: string): Promise<void>;
}
