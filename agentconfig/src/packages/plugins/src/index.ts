import type {
  AgentHookEventMap,
  DetectedAgent,
  DirectiveTypePlugin,
  GeneratorPlugin,
  ImporterPlugin,
  InstructionType,
  ReadonlyRegistry,
} from 'agentconfig-api';
import { instructionDirectiveTypePlugin } from './directive-types/instruction';
import { agentDirectiveTypePlugin } from './directive-types/agent';
import { skillDirectiveTypePlugin } from './directive-types/skill';
import { commandDirectiveTypePlugin } from './directive-types/command';
import { hookDirectiveTypePlugin } from './directive-types/hook';
import antigravityGenerators from './generators/antigravity-generator.plugin';
import claudeCodeGenerators from './generators/claude-code-generator.plugin';
import clineGenerators from './generators/cline-generator.plugin';
import codexGenerators from './generators/codex-generator.plugin';
import copilotGenerators from './generators/copilot-generator.plugin';
import cursorGenerators from './generators/cursor-generator.plugin';
import geminiCliGenerators from './generators/gemini-cli-generator.plugin';
import sharedSkillGenerators from './generators/shared-skill-generator.plugin';
import windsurfGenerators from './generators/windsurf-generator.plugin';
import antigravityImporters, { detect as detectAntigravity } from './importers/antigravity-importer.plugin';
import claudeCodeImporters, { detect as detectClaudeCode } from './importers/claude-code-importer.plugin';
import clineImporters, { detect as detectCline } from './importers/cline-importer.plugin';
import codexImporters, { detect as detectCodex } from './importers/codex-importer.plugin';
import copilotImporters, { detect as detectCopilot } from './importers/copilot-importer.plugin';
import cursorImporters, { detect as detectCursor } from './importers/cursor-importer.plugin';
import geminiCliImporters, { detect as detectGeminiCli } from './importers/gemini-cli-importer.plugin';
import windsurfImporters, { detect as detectWindsurf } from './importers/windsurf-importer.plugin';
import { HOOK_EVENT_MAPS } from './generators/base';

type DetectFn = (dir: string) => DetectedAgent[];

export interface WritableRegistry extends ReadonlyRegistry {
  registerGenerator(generator: GeneratorPlugin<InstructionType>): void;
  registerImporter(importer: ImporterPlugin<InstructionType>): void;
  registerDetector(fn: DetectFn): void;
  registerDirectiveType(plugin: DirectiveTypePlugin): void;
  registerHookEventMap(target: string | string[], map: AgentHookEventMap): void;
}

function registerList<T>(items: readonly T[] | T[], register: (item: T) => void): void {
  for (const item of items) {
    register(item);
  }
}

export function registerAll(registry: WritableRegistry): void {
  registerList(
    [
      instructionDirectiveTypePlugin,
      agentDirectiveTypePlugin,
      skillDirectiveTypePlugin,
      commandDirectiveTypePlugin,
      hookDirectiveTypePlugin,
    ],
    (plugin) => registry.registerDirectiveType(plugin),
  );

  registerList(
    [
      ...antigravityGenerators,
      ...claudeCodeGenerators,
      ...clineGenerators,
      ...codexGenerators,
      ...copilotGenerators,
      ...cursorGenerators,
      ...geminiCliGenerators,
      sharedSkillGenerators,
      ...windsurfGenerators,
    ],
    (plugin) => registry.registerGenerator(plugin),
  );

  registerList(
    [
      ...antigravityImporters,
      ...claudeCodeImporters,
      ...clineImporters,
      ...codexImporters,
      ...copilotImporters,
      ...cursorImporters,
      ...geminiCliImporters,
      ...windsurfImporters,
    ],
    (plugin) => registry.registerImporter(plugin),
  );

  registerList(
    [
      detectAntigravity,
      detectClaudeCode,
      detectCline,
      detectCodex,
      detectCopilot,
      detectCursor,
      detectGeminiCli,
      detectWindsurf,
    ],
    (detector) => registry.registerDetector(detector),
  );

  for (const [target, hookMap] of Object.entries(HOOK_EVENT_MAPS)) {
    registry.registerHookEventMap(target, hookMap);
  }
}

export * from './directive-types';
export * from './targets';