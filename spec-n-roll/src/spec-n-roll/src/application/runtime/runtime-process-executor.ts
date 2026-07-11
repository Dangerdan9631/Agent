import type { RuntimeProcessRequest } from '#dispatcher/application/runtime/runtime-process-request.js';

/**
 * Spawns runtime processes after dispatcher target selection.
 */
export interface RuntimeProcessExecutor {
  /**
   * Executes the selected runtime with the invocation payload on stdin.
   *
   * @param request - Raw process launch data prepared by dispatcher application behavior.
   * @returns Runtime process exit code.
   */
  execute(request: RuntimeProcessRequest): number;
}
