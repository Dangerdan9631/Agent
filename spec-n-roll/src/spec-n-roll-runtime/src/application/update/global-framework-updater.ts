/**
 * Receives text emitted while a framework update command runs.
 */
export interface FrameworkUpdateOutput {
  /**
   * Appends one stdout or stderr chunk to the update transcript.
   *
   * @param text - UTF-8 output text exactly as received from the child process.
   */
  write(text: string): void;
}

/**
 * Updates the globally installed Spec-N-Roll framework.
 */
export interface GlobalFrameworkUpdater {
  /**
   * Determines whether an update should be offered for the dispatcher installation.
   *
   * @param installSource - Dispatcher package source classification.
   * @param installedVersion - Installed dispatcher semantic version.
   * @returns True when a global update can be performed.
   */
  isUpdateAvailable(installSource: 'local' | 'remote', installedVersion: string): boolean;

  /**
   * Updates the dispatcher framework while forwarding command output.
   *
   * @param installSource - Dispatcher package source classification.
   * @param installDirectory - Absolute dispatcher package root.
   * @param output - Destination for npm process output.
   * @returns A promise that resolves after the update command succeeds.
   */
  update(installSource: 'local' | 'remote', installDirectory: string, output: FrameworkUpdateOutput): Promise<void>;
}
