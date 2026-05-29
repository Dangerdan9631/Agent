import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentConfig, InstructionType } from 'agentconfig-api';
import type { IPluginRegistry } from '../ports';

export function generateToTempDir(
  items: InstructionType[],
  config: AgentConfig,
  tempDir: string,
  registry: IPluginRegistry,
  targetFilter?: string[],
): void {
  const targets = targetFilter?.length ? targetFilter : config.targets;
  for (const target of targets) {
    for (const plugin of registry.getGenerators(target)) {
      const pluginItems = items.filter((item) => item.typeId === plugin.instructionType);
      plugin.generate(tempDir, pluginItems, { registry });
    }
  }
}

export async function importFromTargets(
  sourceDir: string,
  registry: IPluginRegistry,
  targets?: string[],
): Promise<InstructionType[]> {
  const activeTargets = targets?.length
    ? targets
    : registry.listDetectors().flatMap((detect) => detect(sourceDir)).map((agent) => agent.name);

  const items: InstructionType[] = [];
  for (const target of activeTargets) {
    for (const importer of registry.getImporters(target)) {
      items.push(...(await importer.import(sourceDir, { registry })));
    }
  }

  const deduplicatedItems: InstructionType[] = [];
  const seenBodyKeys = new Set<string>();
  for (const item of items) {
    const body = Reflect.get(item as object, 'body');
    if (typeof body !== 'string') {
      deduplicatedItems.push(item);
      continue;
    }

    const key = `${item.typeId}:${body
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()}`;
    if (seenBodyKeys.has(key)) {
      continue;
    }
    seenBodyKeys.add(key);
    deduplicatedItems.push(item);
  }

  return deduplicatedItems;
}

export function ensureDirectory(dirPath: string, label: string): void {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`${label} not found: ${dirPath}`);
  }
  if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${label} is not a directory: ${dirPath}`);
  }
}

export function countType(items: InstructionType[], typeId: string): number {
  return items.filter((item) => item.typeId === typeId).length;
}

export function resolveOutputDir(configDir: string, config: AgentConfig): string {
  return path.resolve(path.dirname(configDir), config.options.output_dir);
}