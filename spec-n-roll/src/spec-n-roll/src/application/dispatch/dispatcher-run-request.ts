import type { DispatcherCommandOptions } from '#dispatcher/application/dispatch/dispatcher-command-options.js';

/**
 * Describes an invocation accepted by the dispatcher application.
 */
export interface DispatcherRunRequest {
  /**
   * Ordered CLI arguments supplied to the dispatcher without the node
   * executable or script path. Values are preserved for the runtime payload.
   */
  readonly argv: readonly string[];

  /**
   * Parsed dispatcher-only options used for routing decisions.
   */
  readonly options: DispatcherCommandOptions;
}
