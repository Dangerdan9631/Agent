import type { AgentConfig, InstructionType } from 'agentconfig-api';
import type { IArtifactParser, IPluginRegistry } from '../application/ports';

export class ArtifactParser implements IArtifactParser {
  constructor(private readonly registry: IPluginRegistry) {}

  async parse(configDir: string, _config: AgentConfig): Promise<InstructionType[]> {
    const items: InstructionType[] = [];
    for (const plugin of this.registry.listDirectiveTypes()) {
      items.push(...(await Promise.resolve(plugin.parse(configDir))));
    }
    return items;
  }
}