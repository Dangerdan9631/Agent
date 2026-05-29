import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import type { IPluginRegistry } from '../application/ports';
import { GlobalConfigRepository } from './global-config';

export class PluginLoader {
  private loaded = false;

  constructor(
    private readonly registry: IPluginRegistry,
    private readonly globalConfigRepository: GlobalConfigRepository,
  ) {}

  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    const config = await this.globalConfigRepository.load();

    for (const pluginDir of config.pluginDirs) {
      if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
        continue;
      }

      for (const entry of fs.readdirSync(pluginDir)) {
        const fullPath = path.join(pluginDir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && /\.plugin\.(js|cjs|mjs|ts)$/.test(entry)) {
          await this.registry.loadPlugin(url.pathToFileURL(fullPath).href);
          continue;
        }

        if (!stat.isDirectory()) {
          continue;
        }

        const packageJsonPath = path.join(fullPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          continue;
        }

        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
            agentconfig?: { plugin?: boolean };
          };
          if (packageJson.agentconfig?.plugin === true) {
            await this.registry.loadPlugin(url.pathToFileURL(fullPath).href);
          }
        } catch {
          // Ignore invalid package.json files while scanning user plugin directories.
        }
      }
    }

    this.loaded = true;
  }
}