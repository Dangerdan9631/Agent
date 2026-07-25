import type { SkillDataShape } from '#api/contracts/skills/skill-data-shape.js';
import type { SkillRequirements } from '#api/contracts/skills/skill-requirements.js';

/**
 * Defines an agent-neutral capability that extensions translate into native artifacts.
 */
export interface SkillDefinition {
  /**
   * Stable capability identifier. The value must be non-empty and safe for use as a native skill name.
   */
  readonly identifier: string;

  /**
   * Human-readable explanation of the capability's intended outcome.
   */
  readonly purpose: string;

  /**
   * Version of this definition using its owning package's version format.
   */
  readonly version: string;

  /**
   * Named values supplied when the capability is invoked.
   */
  readonly input: SkillDataShape;

  /**
   * Named values returned after the capability completes.
   */
  readonly output: SkillDataShape;

  /**
   * Agent-neutral instruction template translated into native skill content.
   */
  readonly source: string;

  /**
   * External capabilities that an agent extension must resolve for this skill.
   */
  readonly requirements: SkillRequirements;
}
