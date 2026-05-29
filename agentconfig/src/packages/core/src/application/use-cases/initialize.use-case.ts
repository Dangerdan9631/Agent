import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentConfig, InitializeOptions, InitializeResult } from 'agentconfig-api';
import type { IAgentConfigDirWriter, IPluginRegistry } from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';
import { countType, ensureDirectory, importFromTargets } from './shared';

export class InitializeUseCase {
  constructor(
    private readonly registry: IPluginRegistry,
    private readonly pluginLoader: PluginLoader,
    private readonly agentConfigDirWriter: IAgentConfigDirWriter,
  ) {}

  async execute(options: InitializeOptions): Promise<InitializeResult> {
    const sourceDir = path.resolve(options.projectRoot);
    const configDir = options.configPath
      ? path.resolve(options.configPath)
      : path.join(sourceDir, '.agentconfig');

    ensureDirectory(sourceDir, 'Source directory');
    await this.pluginLoader.ensureLoaded();

    const detectedAgents = this.registry.listDetectors().flatMap((detect) => detect(sourceDir));
    if (detectedAgents.length === 0) {
      return { sourceDir, configDir, detectedAgents: [], instructionCount: 0, agentCount: 0 };
    }

    const activeTargets = options.target?.length
      ? options.target
      : detectedAgents.map((agent) => agent.name);

    if (fs.existsSync(configDir)) {
      throw new Error(`.agentconfig/ already exists at ${configDir}.`);
    }

    const items = await importFromTargets(
      sourceDir,
      this.registry,
      options.target?.length ? options.target : undefined,
    );
    const config: AgentConfig = {
      version: 1,
      targets: Array.from(new Set(activeTargets)),
      options: { output_dir: '.' },
    };
    await this.agentConfigDirWriter.write(items, config, configDir);

    return {
      sourceDir,
      configDir,
      detectedAgents,
      instructionCount: countType(items, 'instruction'),
      agentCount: countType(items, 'agent'),
    };
  }
}