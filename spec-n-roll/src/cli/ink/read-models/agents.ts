import { listBundledAgents } from '../../../agents/extension-loader.js';
import { readWorkflowConfig } from '../../../workflow/artifacts.js';

/**
 * Read-only summary of one bundled agent for the agents screen.
 */
export interface AgentSummary {
  /**
   * Stable bundled agent id.
   */
  agentId: string;
  /**
   * Human-readable bundled agent name.
   */
  displayName: string;
  /**
   * Whether the agent appears in workflow config with `enabled: true`.
   */
  isConfigured: boolean;
  /**
   * Whether the agent is enabled for v1 command generation.
   */
  isEnabled: boolean;
}

/**
 * Options controlling agent summary filtering.
 */
export interface ListAgentSummariesOptions {
  /**
   * When true, returns only project-configured enabled agents.
   */
  configuredOnly?: boolean;
}

/**
 * Lists bundled agents with project configuration status.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Optional filter controls.
 * @returns Agent summaries in bundled id order.
 */
export async function listAgentSummaries(
  projectRoot: string,
  options: ListAgentSummariesOptions = {},
): Promise<AgentSummary[]> {
  const config = await readWorkflowConfig(projectRoot);
  const configuredIds = new Set(
    config?.agents.filter((agent) => agent.enabled).map((agent) => agent.id) ?? [],
  );
  const summaries = listBundledAgents().map((agent) => ({
    agentId: agent.id,
    displayName: agent.name,
    isConfigured: configuredIds.has(agent.id),
    isEnabled: configuredIds.has(agent.id),
  }));

  return options.configuredOnly === true
    ? summaries.filter((agent) => agent.isConfigured)
    : summaries;
}
