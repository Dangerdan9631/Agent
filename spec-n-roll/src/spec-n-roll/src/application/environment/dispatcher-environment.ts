/**
 * Supplies process values required to coordinate a dispatcher invocation.
 */
export interface DispatcherEnvironment {
  /**
   * Returns the dispatcher process current working directory.
   *
   * @returns Absolute or process-relative current working directory.
   */
  cwd(): string;

  /**
   * Returns the Node.js executable used to start delegated runtime entrypoints.
   *
   * @returns Absolute path to the Node.js executable.
   */
  nodeExecutablePath(): string;

  /**
   * Returns the directory containing the built dispatcher entrypoint.
   *
   * @returns Absolute dispatcher install directory.
   */
  dispatcherInstallDirectory(): string;
}
