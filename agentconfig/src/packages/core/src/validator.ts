import type { AgentConfig, InstructionType, ValidationResult } from 'agentconfig-api';
import type { IPluginRegistry } from './application/ports';

export function validate(
  items: InstructionType[],
  config: AgentConfig,
  registry: IPluginRegistry,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const item of items) {
    results.push(...item.validate());
  }

  for (const plugin of registry.listDirectiveTypes()) {
    if (!plugin.validate) {
      continue;
    }
    const pluginItems = items.filter((item) => item.typeId === plugin.typeId);
    results.push(...plugin.validate(pluginItems, config));
  }

  for (const generator of registry.listGenerators()) {
    const generatorItems = items.filter((item) => item.typeId === generator.instructionType);
    results.push(...generator.validate(generatorItems, { registry }));
  }

  return results;
}
