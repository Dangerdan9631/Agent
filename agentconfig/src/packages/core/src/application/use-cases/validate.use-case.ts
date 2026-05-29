import type { ValidateOptions, ValidateResult } from 'agentconfig-api';
import type { IArtifactParser, IConfigRepository, IPluginRegistry } from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';
import { validate } from '../../validator';

export class ValidateUseCase {
  constructor(
    private readonly registry: IPluginRegistry,
    private readonly configRepository: IConfigRepository,
    private readonly pluginLoader: PluginLoader,
    private readonly artifactParser: IArtifactParser,
  ) {}

  async execute(options: ValidateOptions): Promise<ValidateResult> {
    const configDir = this.configRepository.resolveConfigDir(options.configPath);
    const config = await this.configRepository.loadConfig(configDir);
    await this.pluginLoader.ensureLoaded();
    const items = await this.artifactParser.parse(configDir, config);
    return { results: validate(items, config, this.registry) };
  }
}