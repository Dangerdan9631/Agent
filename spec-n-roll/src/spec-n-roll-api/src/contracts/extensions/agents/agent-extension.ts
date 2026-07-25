import type { SkillDefinition } from '#api/contracts/skills/skill-definition.js';

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
  createSkills(skills: readonly SkillDefinition[]): Promise<void>;

  /**
   * Configures this agent's Model Context Protocol integration.
   *
   * @returns A promise that resolves when MCP configuration is complete.
   */
  configureMcp(): Promise<void>;
}
