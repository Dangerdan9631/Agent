/**
 * Describes the named values accepted or produced by a neutral skill.
 */
export interface SkillDataShape {
  /**
   * Named value definitions expressed as JSON Schema fragments.
   */
  readonly properties: Readonly<Record<string, Readonly<Record<string, unknown>>>>;

  /**
   * Names of values that must be present. Every name must identify a property.
   */
  readonly required: readonly string[];
}
