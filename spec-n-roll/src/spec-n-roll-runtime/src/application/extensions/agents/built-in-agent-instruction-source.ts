import type { SkillDefinition } from 'spec-n-roll-api';

/**
 * Translates a neutral skill definition into the built-in native Markdown format.
 */
export class BuiltInAgentInstructionSource {
  /**
   * Produces one framework-owned native skill artifact.
   *
   * @param definition - Agent-neutral skill definition to translate.
   * @returns Markdown content suitable for built-in agent skill files.
   */
  source(definition: SkillDefinition): string {
    return `---\nname: ${JSON.stringify(definition.identifier)}\ndescription: ${JSON.stringify(definition.purpose)}\nmetadata:\n  author: "spec-n-roll"\n  version: ${JSON.stringify(definition.version)}\n---\n\n${definition.source}\n`;
  }
}
