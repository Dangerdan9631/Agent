/**
 * A sequential block of text that contributes to one generated agent skill.
 */
export interface AgentInstruction {
  /**
   * Text inserted into the generated skill in its position within the instruction list.
   */
  readonly content: string;
}
