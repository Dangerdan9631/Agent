import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { registry } from './registry';

/**
 * All built-in target names, in registration order.
 * These are the generators that ship with agentconfig and are auto-registered on import.
 */
export const BUILT_IN_TARGETS = [
  'copilot',
  'copilot-cli',
  'cursor',
  'cursor-cli',
  'claude-code',
  'gemini-cli',
  'antigravity',
  'codex',
  'codex-cli',
  'windsurf',
  'cline',
] as const;

export type BuiltInTarget = (typeof BUILT_IN_TARGETS)[number];

export const GlobalToolConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  /**
   * Plugin IDs to register. Built-in target names (e.g. `copilot`, `cursor`)
   * are listed here for reference — they are auto-registered and do not need
   * to be imported. Any other entry is treated as a module path or npm package
   * name and loaded via dynamic import.
   */
  plugins: z.array(z.string()).default([...BUILT_IN_TARGETS]),
});

export type GlobalToolConfig = z.infer<typeof GlobalToolConfigSchema>;

/** Returns the path to the global config directory: `~/.agentconfig/`. */
export function getGlobalConfigDir(): string {
  return path.join(os.homedir(), '.agentconfig');
}

/** Returns the path to the global config file: `~/.agentconfig/config.yaml`. */
export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'config.yaml');
}

/**
 * Load the global tool config from `~/.agentconfig/config.yaml`.
 * Returns defaults (all built-in plugins listed) if the file does not exist.
 */
export async function loadGlobalConfig(): Promise<GlobalToolConfig> {
  const configPath = getGlobalConfigPath();

  let raw: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    raw = (yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>) ?? {};
  }

  return GlobalToolConfigSchema.parse(raw);
}

/** Build the default YAML content for a new global config file. */
function buildDefaultGlobalConfigContent(): string {
  const pluginLines = BUILT_IN_TARGETS.map((t) => `  - ${t}`).join('\n');
  return [
    'version: 1',
    '',
    '# Plugins registered with agentconfig.',
    '# Built-in plugin IDs are listed below. Remove any you do not need.',
    '# To add an external plugin, append its npm package name or file path.',
    'plugins:',
    pluginLines,
    '',
  ].join('\n');
}

/**
 * Create `~/.agentconfig/config.yaml` with all built-in plugins listed, if it
 * does not already exist. This is a no-op when the file is already present.
 */
export function ensureGlobalConfig(): void {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  if (fs.existsSync(configPath)) return;
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, buildDefaultGlobalConfigContent(), 'utf8');
}

/**
 * Load external (non-built-in) plugins listed in `~/.agentconfig/config.yaml`
 * and register them with the global registry. Built-in target names are
 * skipped because they are already auto-registered on import.
 */
export async function loadGlobalPlugins(): Promise<void> {
  const config = await loadGlobalConfig();
  const builtInSet = new Set<string>(BUILT_IN_TARGETS);
  for (const plugin of config.plugins) {
    if (builtInSet.has(plugin)) continue;
    await registry.loadPlugin(plugin);
  }
}
