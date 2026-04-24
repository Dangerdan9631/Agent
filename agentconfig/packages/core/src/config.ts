import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { AgentConfigSchema, type AgentConfig } from './types/config';

/**
 * Walk upward from `startDir` to find the `.agentconfig/` directory.
 * Returns the absolute path to the directory, or `null` if not found.
 */
export function findConfigDir(startDir: string): string | null {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (true) {
    const candidate = path.join(current, '.agentconfig');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    if (current === root) return null;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Load and validate `config.yaml` from the given `.agentconfig/` directory.
 * Any properties in `overrides` are merged on top of the file contents.
 */
export async function loadConfig(
  configDir: string,
  overrides?: Partial<AgentConfig>,
): Promise<AgentConfig> {
  const configPath = path.join(configDir, 'config.yaml');

  let raw: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    raw = (yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>) ?? {};
  }

  return AgentConfigSchema.parse({ ...raw, ...overrides });
}
