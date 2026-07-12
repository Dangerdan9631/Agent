import type { Logger } from 'tslog';
import type { AgentExtensionRegistration } from '#sdk/application/agents/agent-extension-registration.js';
import type { AgentExtensionRegistrationReader } from '#sdk/application/agents/agent-extension-registration-reader.js';

/**
 * Lists agent extensions registered for a project in stable name order.
 */
export class AgentLister {
  /**
   * Creates the agent listing capability.
   *
   * @param reader - Boundary that reads project-specific agent registrations.
   * @param logger - Logger that records listing decisions and results.
   */
  constructor(
    private readonly reader: AgentExtensionRegistrationReader,
    private readonly logger: Logger<unknown>,
  ) {}

  /**
   * Lists all registered agent extensions for the supplied project.
   *
   * @param projectRoot - Absolute project root that owns the extension registrations.
   * @returns Registered agent extensions sorted by name.
   */
  async list(projectRoot: string): Promise<readonly AgentExtensionRegistration[]> {
    this.logger.debug('Listing registered agent extensions.', { projectRoot });
    const registrations = await this.reader.read(projectRoot);
    const listed = [...registrations].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    this.logger.info('Listed registered agent extensions.', {
      projectRoot,
      agentCount: listed.length,
    });
    return listed;
}
}
