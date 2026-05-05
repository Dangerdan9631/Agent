import type { AgentGenerator } from '../types/generator';

/**
 * Options for the {@link IAgentConfigApi.listTargets} operation.
 *
 * @example
 * const { targets } = await api.listTargets();
 * targets.forEach(t => console.log(t.target, '-', t.displayName));
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
 * The `targets` array is ordered by registration time — built-in targets
 * appear first, followed by any plugin-contributed targets in the order
 * they were loaded.
 *
 * @example
 * const { targets } = await api.listTargets();
 * const builtIns = targets.map(t => t.target);
 * // e.g. ['cursor', 'copilot', 'claude-code', 'codex', ...]
 */
export interface ListTargetsResult {
  /**
   * All generator targets registered at the time of the call.
   *
   * Each entry describes a single target with its unique `target` identifier
   * and a human-readable `displayName`. Use the `target` value when
   * specifying targets in {@link GenerateOptions.targets} or
   * {@link DiffOptions.targets}.
   *
   * @see {@link AgentGenerator}
   */
  targets: AgentGenerator[];
}
