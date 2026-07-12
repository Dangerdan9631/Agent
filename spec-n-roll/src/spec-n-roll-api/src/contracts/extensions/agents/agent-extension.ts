import type { AgentSkill } from '#api/contracts/extensions/agents/agent-skill.js';

/**
 * Integrates Spec-N-Roll skills and MCP configuration with one coding agent.
 */
export interface AgentExtension {
  /**
   * Creates agent-native skills from the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to create.
   * @returns A promise that resolves when the skills are created.
   */
  createSkills(skills: readonly AgentSkill[]): Promise<void>;

  /**
   * Configures this agent's Model Context Protocol integration.
   *
   * @returns A promise that resolves when MCP configuration is complete.
   */
  configureMcp(): Promise<void>;
}
