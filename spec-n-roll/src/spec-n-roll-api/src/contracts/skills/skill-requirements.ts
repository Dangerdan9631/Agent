/**
 * Declares external capabilities that must be available when a skill runs.
 */
export interface SkillRequirements {
  /**
   * Agent-neutral tool identifiers required by the skill.
   */
  readonly tools: readonly string[];

  /**
   * MCP server identifiers required by the skill.
   */
  readonly mcpServers: readonly string[];
}
