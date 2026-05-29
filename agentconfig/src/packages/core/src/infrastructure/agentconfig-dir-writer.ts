import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { AgentConfig, InstructionType, WriteOptions } from 'agentconfig-api';
import type { IAgentConfigDirWriter, IPluginRegistry } from '../application/ports';

export class AgentConfigDirWriter implements IAgentConfigDirWriter {
  constructor(private readonly registry: IPluginRegistry) {}

  async write(
    items: InstructionType[],
    config: AgentConfig,
    configDir: string,
    opts?: WriteOptions,
  ): Promise<void> {
    if (!opts?.dryRun) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configData: Record<string, unknown> = {
      version: config.version,
      targets: config.targets,
      options: config.options,
    };
    if (config.last_generated) {
      configData.last_generated = config.last_generated;
    }

    this.writeFile(path.join(configDir, 'config.yaml'), yaml.dump(configData), opts);

    for (const plugin of this.registry.listDirectiveTypes()) {
      if (!plugin.write) {
        continue;
      }
      const pluginItems = items.filter((item) => item.typeId === plugin.typeId);
      await Promise.resolve(plugin.write(pluginItems, configDir, opts));
    }
  }

  private writeFile(filePath: string, content: string, opts?: WriteOptions): void {
    if (opts?.overwrite === false && fs.existsSync(filePath)) {
      return;
    }
    if (opts?.dryRun) {
      return;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
}