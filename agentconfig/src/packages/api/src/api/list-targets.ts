/**
 * Options for the {@link IAgentConfigApi.listTargets} operation.
 *
 * @example
 * const { targets } = await api.listTargets();
 * targets.forEach(t => console.log(t));
 */
export interface ListTargetsOptions {
  /**
   * Path used to locate and load project-local plugins before listing.
   *
   * When provided the implementation resolves the nearest `.agentconfig/`
   * directory relative to this path and loads any plugins declared there
   * before returning the target list. This ensures project-specific targets
   * appear in the result alongside globally registered built-ins.
   *
   * When omitted, only globally registered targets (built-ins and any
   * previously loaded global plugins) are returned.
   */
  configPath?: string;
}

/**
 * The result of a {@link IAgentConfigApi.listTargets} operation.
 *
 * @example
 * const { targets } = await api.listTargets();
 * // e.g. ['cursor', 'copilot', 'claude-code', 'codex', ...]
 */
export interface ListTargetsResult {
  /**
   * All generator targets registered at the time of the call.
   */
  targets: string[];
}
