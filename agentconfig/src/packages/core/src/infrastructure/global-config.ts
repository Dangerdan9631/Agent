import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

export const GlobalToolConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  pluginDirs: z.array(z.string()).default([]),
});

export type GlobalToolConfig = z.infer<typeof GlobalToolConfigSchema>;

export class GlobalConfigRepository {
  getConfigDir(): string {
    return path.join(os.homedir(), '.agentconfig');
  }

  getConfigPath(): string {
    return path.join(this.getConfigDir(), 'config.yaml');
  }

  ensureExists(): void {
    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      return;
    }

    fs.mkdirSync(this.getConfigDir(), { recursive: true });
    fs.writeFileSync(configPath, this.buildDefaultContent(), 'utf8');
  }

  async load(): Promise<GlobalToolConfig> {
    this.ensureExists();
    const configPath = this.getConfigPath();
    let raw: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      raw = (yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>) ?? {};
    }
    if (raw.plugins && !raw.pluginDirs) {
      raw.pluginDirs = raw.plugins;
    }
    return GlobalToolConfigSchema.parse(raw);
  }

  buildDefaultContent(): string {
    return [
      'version: 1',
      '',
      '# Directories to scan for user-defined agentconfig plugins.',
      'pluginDirs: []',
      '',
    ].join('\n');
  }
}