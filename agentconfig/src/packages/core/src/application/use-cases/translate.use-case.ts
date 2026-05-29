import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AgentConfig, TranslateOptions, TranslateResult } from 'agentconfig-api';
import type { IArtifactWriter, IPluginRegistry } from '../ports';
import { PluginLoader } from '../../infrastructure/plugin-loader';
import { countType, ensureDirectory, generateToTempDir, importFromTargets } from './shared';

export class TranslateUseCase {
  constructor(
    private readonly registry: IPluginRegistry,
    private readonly pluginLoader: PluginLoader,
    private readonly artifactWriter: IArtifactWriter,
  ) {}

  async execute(options: TranslateOptions): Promise<TranslateResult> {
    const projectRoot = path.resolve(options.projectRoot ?? '.');
    ensureDirectory(projectRoot, 'Project root');
    await this.pluginLoader.ensureLoaded();

    if (this.registry.getImporters(options.sourceTarget).length === 0) {
      throw new Error(`Unknown source target: ${options.sourceTarget}`);
    }
    if (this.registry.getGenerators(options.destTarget).length === 0) {
      throw new Error(`Unknown destination target: ${options.destTarget}`);
    }

    const items = await importFromTargets(projectRoot, this.registry, [options.sourceTarget]);
    const config: AgentConfig = {
      version: 1,
      targets: [options.destTarget],
      options: { output_dir: '.' },
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentconfig-trans-'));
    let fileCount = 0;
    try {
      generateToTempDir(items, config, tempDir, this.registry, [options.destTarget]);
      fileCount = await this.artifactWriter.write(tempDir, projectRoot, { overwrite: true, dryRun: false });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return {
      projectRoot,
      sourceTarget: options.sourceTarget,
      destTarget: options.destTarget,
      instructionCount: countType(items, 'instruction'),
      agentCount: countType(items, 'agent'),
      fileCount,
    };
  }
}