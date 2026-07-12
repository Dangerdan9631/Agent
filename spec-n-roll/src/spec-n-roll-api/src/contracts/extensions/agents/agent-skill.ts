import type { AgentInstruction } from '#api/contracts/extensions/agents/agent-instruction.js';
import type { AgentSkillMetadata } from '#api/contracts/extensions/agents/agent-skill-metadata.js';

/**
 * Configuration used to create one agent skill.
 */
export interface AgentSkill {
  /**
   * Stable skill name. The value must be non-empty.
   */
  readonly name: string;

  /**
   * Human-readable explanation of the skill's purpose. The value must be non-empty.
   */
  readonly description: string;

  /**
   * Authorship and version information identifying this skill definition.
   */
  readonly metadata: AgentSkillMetadata;

  /**
   * Ordered instruction blocks to include in the generated skill.
   */
  readonly instructions: readonly AgentInstruction[];
}
