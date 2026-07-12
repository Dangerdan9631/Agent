import type { AgentExtensionRegistration } from '#sdk/application/agents/agent-extension-registration.js';

/**
 * Reads agent extension registrations from a project-specific storage boundary.
 */
export interface AgentExtensionRegistrationReader {
  /**
   * Reads every configured agent extension without loading its module.
   *
   * @param projectRoot - Absolute project root that owns the extension registrations.
   * @returns Registered agent extensions and their enabled state.
   */
  read(projectRoot: string): Promise<readonly AgentExtensionRegistration[]>;
}
