import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { GenerateOptions, GenerateResult } from 'agentconfig-api';
import type {
  IArtifactParser,
  IArtifactWriter,
  IConfigRepository,
  IPluginRegistry,
} from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';
import { validate } from '../../validator';
import { generateToTempDir, resolveOutputDir } from './shared';

export class GenerateUseCase {
  constructor(
    private readonly registry: IPluginRegistry,
    private readonly configRepository: IConfigRepository,
    private readonly pluginLoader: PluginLoader,
    private readonly artifactParser: IArtifactParser,
    private readonly artifactWriter: IArtifactWriter,
  ) {}

  async execute(options: GenerateOptions): Promise<void> {
    const result = await this.generateOnce(options);
    options.onEvent?.({ type: 'generated', result });

    if (!options.watch) {
      return;
    }

    options.onEvent?.({ type: 'watching', configDir: result.configDir });
    const { default: chokidar } = await import('chokidar');
    const watcher = chokidar.watch(result.configDir, { ignoreInitial: true });
    let busy = false;

    const onChange = async (changedPath: string) => {
      if (busy) {
        return;
      }
      busy = true;
      options.onEvent?.({ type: 'change', path: changedPath });
      try {
        options.onEvent?.({ type: 'generated', result: await this.generateOnce(options) });
      } catch (error) {
        options.onEvent?.({ type: 'error', error });
      } finally {
        busy = false;
      }
    };

    watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
  }

  private async generateOnce(options: GenerateOptions): Promise<GenerateResult> {
    const configDir = this.configRepository.resolveConfigDir(options.configPath);
    const overrides = options.projectRootOverride
      ? { options: { output_dir: options.projectRootOverride } }
      : undefined;
    const config = await this.configRepository.loadConfig(configDir, overrides);
    await this.pluginLoader.ensureLoaded();

    const items = await this.artifactParser.parse(configDir, config);
    const validationErrors = validate(items, config, this.registry).filter((result) => result.level === 'error');
    const outputDir = resolveOutputDir(configDir, config);
    const targets = options.targets?.length ? options.targets : config.targets;

    if (validationErrors.length > 0) {
      for (const error of validationErrors) {
        options.onEvent?.({ type: 'validation-error', error });
      }
      throw new Error('Validation errors found. Fix them before generating.');
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentconfig-gen-'));
    let fileCount = 0;
    try {
      generateToTempDir(items, config, tempDir, this.registry, options.targets);
      fileCount = await this.artifactWriter.write(tempDir, outputDir, { overwrite: true, dryRun: false });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    config.last_generated = new Date().toISOString();
    await this.configRepository.saveConfig(configDir, config);

    return { configDir, outputDir, targets, validationErrors: [], fileCount };
  }
}