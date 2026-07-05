import type { RuntimeInvocation, RuntimeTarget } from 'spec-n-roll-api';

/**
 * Spawns runtime processes after dispatcher target selection.
 */
export interface RuntimeProcessExecutor {
  /**
   * Executes the selected runtime with the invocation payload on stdin.
   *
   * @param target - Runtime executable selected by the dispatcher.
   * @param invocation - JSON-serializable dispatcher invocation payload.
   * @returns Runtime process exit code.
   */
  execute(target: RuntimeTarget, invocation: RuntimeInvocation): number;
}
