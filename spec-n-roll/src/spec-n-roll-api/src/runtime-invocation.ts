import type { DispatcherMetadata } from '#api/dispatcher-metadata.js';

/**
 * Describes the argument payload passed across the dispatcher/runtime boundary.
 */
export interface RuntimeInvocation {
  /**
   * Ordered CLI arguments supplied to the dispatcher without the node
   * executable or dispatcher script path. Values are preserved verbatim.
   */
  readonly argv: readonly string[];

  /**
   * Dispatcher package and install-source metadata captured before process
   * delegation.
   */
  readonly dispatcher: DispatcherMetadata;

  /**
   * Absolute project root resolved for the invocation. Omitted when discovery
   * does not find a Spec-N-Roll project root.
   */
  readonly projectRoot?: string;

  /**
   * Absolute working directory selected for the child process. This is the
   * project root when one is resolved, otherwise the caller working directory.
   */
  readonly cwd: string;
}
