import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { AgentConfig } from 'agentconfig-api';
import type { IConfigRepository } from '../application/ports';
import { AgentConfigSchema } from '../config-schema';

export class ConfigRepository implements IConfigRepository {
  findConfigDir(startDir: string): string | null {
    let current = path.resolve(startDir);
    const { root } = path.parse(current);

    while (true) {
      const candidate = path.join(current, '.agentconfig');
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
      if (current === root) {
        return null;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }

  resolveConfigDir(startDir?: string): string {
    const from = startDir ?? process.cwd();
    const configDir = this.findConfigDir(from);
    if (!configDir) {
      throw new Error(
        `No .agentconfig/ directory found starting from ${from}.\nRun in a directory that contains .agentconfig/ or use --config <path>.`,
      );
    }
    return configDir;
  }

  async loadConfig(configDir: string, overrides?: Partial<AgentConfig>): Promise<AgentConfig> {
    const configPath = path.join(configDir, 'config.yaml');
    let raw: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      raw = (yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>) ?? {};
    }
    return AgentConfigSchema.parse({ ...raw, ...overrides });
  }

  async saveConfig(configDir: string, config: AgentConfig): Promise<void> {
    const configPath = path.join(configDir, 'config.yaml');
    const configData: Record<string, unknown> = {
      version: config.version,
      targets: config.targets,
      options: config.options,
    };
    if (config.last_generated) {
      configData.last_generated = config.last_generated;
    }
    fs.writeFileSync(configPath, yaml.dump(configData), 'utf8');
  }
}