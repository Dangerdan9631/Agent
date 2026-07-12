/**
 * Describes one agent extension registered for a project.
 */
export interface AgentExtensionRegistration {
  /**
   * Stable agent extension identifier. This is the configured extension folder name.
   */
  readonly name: string;

  /**
   * Whether the registered agent extension is eligible for use.
   */
  readonly enabled: boolean;
}
