import type {
  AgentHookEventMap,
  DetectedAgent,
  DirectiveTypePlugin,
  GeneratorPlugin,
  ImporterPlugin,
  InstructionType,
  ReadonlyRegistry,
} from 'agentconfig-api';

export type DetectFn = (dir: string) => DetectedAgent[];

export interface IPluginRegistry extends ReadonlyRegistry {
  registerGenerator(generator: GeneratorPlugin<InstructionType>): void;
  registerImporter(importer: ImporterPlugin<InstructionType>): void;
  registerDetector(fn: DetectFn): void;
  listDetectors(): DetectFn[];
  registerDirectiveType(plugin: DirectiveTypePlugin): void;
  registerHookEventMap(target: string | string[], map: AgentHookEventMap): void;
  loadPlugin(moduleId: string): Promise<void>;
}