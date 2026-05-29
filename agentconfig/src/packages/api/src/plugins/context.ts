import type { DirectiveTypePlugin } from '../types';
import type { GeneratorPlugin } from './generator-plugin';
import type { ImporterPlugin } from './importer-plugin';
import type { InstructionType } from './instruction-type';
import type { AgentHookEventMap } from '../types';

/**
 * A read-only interface to the plugin registry, provided to plugins
 * during execution so they can query other registered plugins and types.
 */
export interface ReadonlyRegistry {
  /** Return all registered generators. */
  listGenerators(): GeneratorPlugin<InstructionType>[];
  /** Look up all generators for a specific target ID. */
  getGenerators(target: string): GeneratorPlugin<InstructionType>[];

  /** Return all registered importers. */
  listImporters(): ImporterPlugin<InstructionType>[];
  /** Look up all importers for a specific target ID. */
  getImporters(target: string): ImporterPlugin<InstructionType>[];

  /** Return all registered directive type plugins. */
  listDirectiveTypes(): DirectiveTypePlugin[];
  /** Look up a directive type plugin by typeId. */
  getDirectiveType(typeId: string): DirectiveTypePlugin | undefined;
  /** Look up a registered hook event map for a specific target ID. */
  getHookEventMap(target: string): AgentHookEventMap | undefined;
}

/**
 * Execution context provided to plugins when generating or importing content.
 */
export interface AgentConfigContext {
  /** Access to the central plugin registry. */
  readonly registry: ReadonlyRegistry;
}
