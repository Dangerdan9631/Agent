import type { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';

/**
 * Serves a resolved Atlas artifact root through a local HTTP boundary.
 */
export interface ArtifactServer {
  /**
   * Starts serving one artifact root and returns its landscape URL.
   *
   * @param artifactRootPath - Absolute artifact directory permitted for static file access.
   * @param host - Interface hostname or address to bind.
   * @param port - TCP port to bind. Zero requests an operating-system-selected port.
   * @param configurationPath - Absolute configured Atlas policy path permitted for explicit viewer actions.
   * @returns Active server location after the listener is ready.
   */
  start(
    artifactRootPath: string,
    host: string,
    port: number,
    configurationPath: string
  ): Promise<ArtifactServerLocation>;

  /**
   * Stops an active local artifact server and releases its listener resources.
   *
   * @returns A promise that resolves once the listener has stopped.
   */
  stop(): Promise<void>;
}
