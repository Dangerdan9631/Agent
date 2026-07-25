/**
 * Supplies scaffold-level instructions for built-in agent integrations.
 */
export class BuiltInAgentInstructionSource {
  /**
   * Produces the framework-owned placeholder skill for a supported built-in agent.
   *
   * @param agentName - Built-in agent name used in the instruction title.
   * @returns Markdown skill content that can be replaced by richer agent behavior later.
   */
  source(agentName: string): string {
    return `---\nname: spec-n-roll\ndescription: Scaffold instructions for working with Spec-N-Roll.\nmetadata:\n  author: spec-n-roll\n  version: 0.1.0\n---\n\n# Spec-N-Roll scaffold\n\nUse this placeholder skill as the project-local home for Spec-N-Roll agent guidance. Inspect the project's specifications before making changes, keep requirements and verification aligned, and replace this scaffold with focused workflow instructions as the project matures.\n\nBuilt-in integration: ${agentName}.\n`;
  }
}
