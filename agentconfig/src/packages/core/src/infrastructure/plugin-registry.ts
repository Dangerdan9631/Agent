import type {
  AgentHookEventMap,
  DirectiveTypePlugin,
  GeneratorPlugin,
  ImporterPlugin,
  InstructionType,
} from 'agentconfig-api';
import type { DetectFn, IPluginRegistry } from '../application/ports';

function isAgentMatch(agent: string | string[], target: string): boolean {
  return Array.isArray(agent) ? agent.includes(target) : agent === target;
}

export class PluginRegistry implements IPluginRegistry {
  private readonly generators: GeneratorPlugin<InstructionType>[] = [];
  private readonly importers: ImporterPlugin<InstructionType>[] = [];
  private readonly detectors: DetectFn[] = [];
  private readonly directiveTypes = new Map<string, DirectiveTypePlugin>();
  private readonly hookEventMaps = new Map<string, AgentHookEventMap>();

  registerGenerator(generator: GeneratorPlugin<InstructionType>): void {
    this.generators.push(generator);
  }

  getGenerators(target: string): GeneratorPlugin<InstructionType>[] {
    return this.generators.filter((generator) => isAgentMatch(generator.agent, target));
  }

  listGenerators(): GeneratorPlugin<InstructionType>[] {
    return [...this.generators];
  }

  registerImporter(importer: ImporterPlugin<InstructionType>): void {
    this.importers.push(importer);
  }

  getImporters(target: string): ImporterPlugin<InstructionType>[] {
    return this.importers.filter((importer) => isAgentMatch(importer.agent, target));
  }

  listImporters(): ImporterPlugin<InstructionType>[] {
    return [...this.importers];
  }

  registerDetector(fn: DetectFn): void {
    this.detectors.push(fn);
  }

  listDetectors(): DetectFn[] {
    return [...this.detectors];
  }

  registerDirectiveType(plugin: DirectiveTypePlugin): void {
    this.directiveTypes.set(plugin.typeId, plugin);
  }

  getDirectiveType(typeId: string): DirectiveTypePlugin | undefined {
    return this.directiveTypes.get(typeId);
  }

  listDirectiveTypes(): DirectiveTypePlugin[] {
    return Array.from(this.directiveTypes.values());
  }

  registerHookEventMap(target: string | string[], map: AgentHookEventMap): void {
    for (const currentTarget of Array.isArray(target) ? target : [target]) {
      this.hookEventMaps.set(currentTarget, map);
    }
  }

  getHookEventMap(target: string): AgentHookEventMap | undefined {
    return this.hookEventMaps.get(target);
  }

  async loadPlugin(moduleId: string): Promise<void> {
    const mod = (await import(moduleId)) as Record<string, unknown>;
    let exported: unknown = mod;

    while (exported && typeof exported === 'object' && 'default' in (exported as Record<string, unknown>)) {
      exported = (exported as Record<string, unknown>).default;
    }

    if (Array.isArray(exported)) {
      for (const item of exported) {
        this.registerOne(item);
      }
    } else {
      this.registerOne(exported);
    }

    if (typeof mod.detect === 'function') {
      this.registerDetector(mod.detect as DetectFn);
    }

    if (mod.hookEventMaps && typeof mod.hookEventMaps === 'object') {
      for (const [target, hookMap] of Object.entries(mod.hookEventMaps as Record<string, AgentHookEventMap>)) {
        this.registerHookEventMap(target, hookMap);
      }
    }
  }

  private registerOne(plugin: unknown): void {
    if (typeof plugin !== 'object' || plugin === null) {
      return;
    }

    const current = plugin as Record<string, unknown>;
    if (typeof current.typeId === 'string' && typeof current.parse === 'function') {
      this.registerDirectiveType(plugin as DirectiveTypePlugin);
      return;
    }

    if (
      (typeof current.agent === 'string' || Array.isArray(current.agent)) &&
      typeof current.instructionType === 'string' &&
      typeof current.validate === 'function' &&
      typeof current.generate === 'function'
    ) {
      this.registerGenerator(plugin as GeneratorPlugin<InstructionType>);
    }

    if (
      (typeof current.agent === 'string' || Array.isArray(current.agent)) &&
      typeof current.instructionType === 'string' &&
      typeof current.validate === 'function' &&
      typeof current.import === 'function'
    ) {
      this.registerImporter(plugin as ImporterPlugin<InstructionType>);
    }
  }
}