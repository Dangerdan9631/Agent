/**
 * Reads process and package details needed by dispatcher services.
 */
export interface DispatcherEnvironment {
  /**
   * Returns the dispatcher process current working directory.
   *
   * @returns Absolute or process-relative current working directory.
   */
  cwd(): string;

  /**
   * Returns the Node.js executable path used to run delegated JavaScript
   * entrypoints.
   *
   * @returns Absolute path to the Node.js executable.
   */
  nodeExecutablePath(): string;

  /**
   * Returns the directory containing the built dispatcher entrypoint.
   *
   * @returns Absolute directory path for the dispatcher install.
   */
  dispatcherInstallDirectory(): string;
}
