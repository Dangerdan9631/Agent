import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DiffOptions, DiffResult } from 'agentconfig-api';
import type {
  IArtifactParser,
  IArtifactWriter,
  IConfigRepository,
  IPluginRegistry,
} from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';
import { generateToTempDir, resolveOutputDir } from './shared';

export class DiffUseCase {
  constructor(
    private readonly registry: IPluginRegistry,
    private readonly configRepository: IConfigRepository,
    private readonly pluginLoader: PluginLoader,
    private readonly artifactParser: IArtifactParser,
    private readonly artifactWriter: IArtifactWriter,
  ) {}

  async execute(options: DiffOptions): Promise<DiffResult> {
    const configDir = this.configRepository.resolveConfigDir(options.configPath);
    const overrides = options.projectRootOverride
      ? { options: { output_dir: options.projectRootOverride } }
      : undefined;
    const config = await this.configRepository.loadConfig(configDir, overrides);
    await this.pluginLoader.ensureLoaded();

    const items = await this.artifactParser.parse(configDir, config);
    const outputDir = resolveOutputDir(configDir, config);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentconfig-diff-'));
    try {
      generateToTempDir(items, config, tempDir, this.registry, options.targets);
      return {
        diff: await this.artifactWriter.computeDiff(tempDir, outputDir),
        outputDir,
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}