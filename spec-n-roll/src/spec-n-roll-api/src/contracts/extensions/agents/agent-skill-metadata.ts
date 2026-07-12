/**
 * Identifies the source and revision of an agent skill configuration.
 */
export interface AgentSkillMetadata {
  /**
   * Stable name of the skill author or owning package. The value must be non-empty.
   */
  readonly author: string;

  /**
   * Version of the skill definition using the owning package's version format.
   */
  readonly version: string;
}
