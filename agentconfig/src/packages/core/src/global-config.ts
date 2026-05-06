import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';
import yaml from 'js-yaml';
import { z } from 'zod';
import { registry } from './registry';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function getDefaultPluginDir(): string {
  // Return the absolute path to the built-in plugins folder.
  // In source tree it's at `src/packages/core/src/built-in-plugins`.
  // In dist it might be `dist/built-in-plugins`.
  return path.resolve(__dirname, 'built-in-plugins');
}

export const GlobalToolConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  /**
   * Directories to scan for plugin files (*.plugin.js) or plugin packages.
   */
  pluginDirs: z.array(z.string()).default([getDefaultPluginDir()]),
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
 * Returns defaults if the file does not exist.
 */
export async function loadGlobalConfig(): Promise<GlobalToolConfig> {
  ensureGlobalConfig();
  const configPath = getGlobalConfigPath();

  let raw: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    raw = (yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>) ?? {};
  }

  // Handle older `plugins: string[]` by warning the user
  if (raw.plugins && !raw.pluginDirs) {
    console.warn(`[agentconfig] config.yaml uses deprecated "plugins". Please use "pluginDirs" instead.`);
    raw.pluginDirs = [getDefaultPluginDir()];
  }

  return GlobalToolConfigSchema.parse(raw);
}

/** Build the default YAML content for a new global config file. */
function buildDefaultGlobalConfigContent(): string {
  const defaultDir = getDefaultPluginDir();
  return [
    'version: 1',
    '',
    '# Directories to scan for agentconfig plugins.',
    '# A plugin directory can contain standalone files (*.plugin.js, *.plugin.mjs)',
    '# or Node packages (directories with a package.json containing "agentconfig": { "plugin": true }).',
    'pluginDirs:',
    `  - "${defaultDir.replace(/\\/g, '/')}"`,
    '',
  ].join('\n');
}

/**
 * Create `~/.agentconfig/config.yaml` with the default pluginDirs listed, if it
 * does not already exist. This is a no-op when the file is already present.
 */
export function ensureGlobalConfig(): void {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  if (fs.existsSync(configPath)) return;
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, buildDefaultGlobalConfigContent(), 'utf8');
}

let pluginsLoaded = false;

/**
 * Load all plugins from the configured `pluginDirs`.
 */
export async function loadGlobalPlugins(): Promise<void> {
  if (pluginsLoaded) return;
  const config = await loadGlobalConfig();

  for (const dir of config.pluginDirs) {
    if (!fs.existsSync(dir)) continue;
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) continue;

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isFile()) {
        if (/\.plugin\.(js|cjs|mjs|ts)$/.test(entry)) {
          // Convert to file URL for dynamic import (required for absolute paths on Windows)
          const fileUrl = url.pathToFileURL(fullPath).href;
          await registry.loadPlugin(fileUrl).catch(e => {
            console.warn(`[agentconfig] Failed to load plugin file ${fullPath}:`, e);
          });
        }
      } else if (entryStat.isDirectory()) {
        const pkgPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.agentconfig?.plugin === true) {
              const dirUrl = url.pathToFileURL(fullPath).href;
              await registry.loadPlugin(dirUrl).catch(e => {
                console.warn(`[agentconfig] Failed to load plugin package ${fullPath}:`, e);
              });
            }
          } catch (e) {
            // Ignored, bad package.json
          }
        }
      }
    }
  }
  pluginsLoaded = true;
}
