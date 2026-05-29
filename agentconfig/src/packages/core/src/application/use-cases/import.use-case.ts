import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentConfig, ImportOptions, ImportResult } from 'agentconfig-api';
import type { IAgentConfigDirWriter, IArtifactParser, IConfigRepository } from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';
import { countType } from './shared';

export class ImportUseCase {
  constructor(
    private readonly configRepository: IConfigRepository,
    private readonly pluginLoader: PluginLoader,
    private readonly artifactParser: IArtifactParser,
    private readonly agentConfigDirWriter: IAgentConfigDirWriter,
  ) {}

  async execute(options: ImportOptions): Promise<ImportResult> {
    await this.pluginLoader.ensureLoaded();

    const sourceConfigDir = this.configRepository.resolveConfigDir(options.sourceDir);
    const sourceConfig = await this.configRepository.loadConfig(sourceConfigDir);
    const sourceItems = await this.artifactParser.parse(sourceConfigDir, sourceConfig);

    const destinationRoot = options.configPath
      ? path.dirname(path.resolve(options.configPath))
      : process.cwd();
    const requestedConfigDir = options.configPath ? path.resolve(options.configPath) : undefined;
    const existingConfigDir = requestedConfigDir
      ? fs.existsSync(requestedConfigDir)
        ? requestedConfigDir
        : undefined
      : this.configRepository.findConfigDir(destinationRoot) ?? undefined;
    const destinationConfigDir = requestedConfigDir ?? existingConfigDir ?? path.join(destinationRoot, '.agentconfig');

    let mergedTargets = sourceConfig.targets;
    if (existingConfigDir) {
      const destinationConfig = await this.configRepository.loadConfig(existingConfigDir).catch(() => null);
      if (destinationConfig) {
        mergedTargets = Array.from(new Set([...destinationConfig.targets, ...sourceConfig.targets]));
      }
    }

    const mergedConfig: AgentConfig = {
      version: 1,
      targets: mergedTargets,
      options: { output_dir: '.' },
    };

    await this.agentConfigDirWriter.write(sourceItems, mergedConfig, destinationConfigDir, {
      overwrite: false,
      dryRun: false,
    });

    return {
      sourceConfigDir,
      destConfigDir: destinationConfigDir,
      instructionCount: countType(sourceItems, 'instruction'),
      agentCount: countType(sourceItems, 'agent'),
    };
  }
}