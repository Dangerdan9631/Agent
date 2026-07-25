import type { SkillDefinition } from 'spec-n-roll-api';

/**
 * Supplies the framework-owned neutral skill bundled with new projects.
 */
export class BuiltInSkillDefinitionSource {
  /**
   * Produces the initial Spec-N-Roll capability definition.
   *
   * @returns Agent-neutral scaffold definition shared by every built-in extension.
   */
  definition(): SkillDefinition {
    return {
      identifier: 'spec-n-roll',
      purpose: 'Scaffold instructions for working with Spec-N-Roll.',
      version: '0.1.0',
      input: { properties: {}, required: [] },
      output: { properties: {}, required: [] },
      source:
        "# Spec-N-Roll scaffold\n\nUse this placeholder skill as the project-local home for Spec-N-Roll agent guidance. Inspect the project's specifications before making changes, keep requirements and verification aligned, and replace this scaffold with focused workflow instructions as the project matures.",
      requirements: {
        tools: [],
        mcpServers: ['spec-n-roll'],
      },
    };
  }
}
