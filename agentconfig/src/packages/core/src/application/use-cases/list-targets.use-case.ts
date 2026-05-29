import type { ListTargetsOptions, ListTargetsResult } from 'agentconfig-api';
import type { IPluginRegistry } from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';

export class ListTargetsUseCase {
  constructor(
    private readonly registry: IPluginRegistry,
    private readonly pluginLoader: PluginLoader,
  ) {}

  async execute(_options?: ListTargetsOptions): Promise<ListTargetsResult> {
    await this.pluginLoader.ensureLoaded();
    const targets = new Set<string>();
    for (const generator of this.registry.listGenerators()) {
      for (const agent of Array.isArray(generator.agent) ? generator.agent : [generator.agent]) {
        targets.add(agent);
      }
    }
    return { targets: Array.from(targets) };
  }
}