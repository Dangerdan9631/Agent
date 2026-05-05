import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { AgentConfigSchema } from './config-schema';
import type { AgentConfig } from 'agentconfig-api';

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
 * Locate the `.agentconfig/` directory starting from `startDir` (defaults to
 * `process.cwd()`). Throws an `Error` if no directory is found.
 */
export function resolveConfigDir(startDir?: string): string {
  const from = startDir ?? process.cwd();
  const dir = findConfigDir(from);
  if (!dir) {
    throw new Error(
      `No .agentconfig/ directory found starting from ${from}.\n` +
        `Run in a directory that contains .agentconfig/ or use --config <path>.`,
    );
  }
  return dir;
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

/**
 * Save the given `AgentConfig` to `config.yaml` in the given `.agentconfig/` directory.
 */
export async function saveConfig(
  configDir: string,
  config: AgentConfig,
): Promise<void> {
  const configPath = path.join(configDir, 'config.yaml');
  const configData: Record<string, unknown> = {
    version: config.version,
    targets: config.targets,
    options: config.options,
  };
  
  if (config.last_generated) {
    configData.last_generated = config.last_generated;
  }
  
  const configYaml = yaml.dump(configData);
  fs.writeFileSync(configPath, configYaml, 'utf8');
}
