import type { IAgentConfigApi } from 'agentconfig-api';
import type { IPluginRegistry } from './application/ports';
import {
	DiffUseCase,
	GenerateUseCase,
	ImportUseCase,
	InitializeUseCase,
	ListTargetsUseCase,
	TranslateUseCase,
	ValidateUseCase,
} from './application/use-cases';
import { AgentConfigApiAdapter } from './agent-config-api';
import { ArtifactParser } from './infrastructure/artifact-parser';
import { AgentConfigDirWriter } from './infrastructure/agentconfig-dir-writer';
import { ArtifactWriter } from './infrastructure/artifact-writer';
import { ConfigRepository } from './infrastructure/config-repository';
import { GlobalConfigRepository } from './infrastructure/global-config';
import { PluginLoader } from './infrastructure/plugin-loader';
import { PluginRegistry } from './infrastructure/plugin-registry';

export function createAgentConfigApi(setupRegistry?: (registry: IPluginRegistry) => void): IAgentConfigApi {
	const registry = new PluginRegistry();
	setupRegistry?.(registry);

	const globalConfigRepository = new GlobalConfigRepository();
	const pluginLoader = new PluginLoader(registry, globalConfigRepository);
	const configRepository = new ConfigRepository();
	const artifactParser = new ArtifactParser(registry);
	const artifactWriter = new ArtifactWriter();
	const agentConfigDirWriter = new AgentConfigDirWriter(registry);

	return new AgentConfigApiAdapter(
		new GenerateUseCase(registry, configRepository, pluginLoader, artifactParser, artifactWriter),
		new ValidateUseCase(registry, configRepository, pluginLoader, artifactParser),
		new DiffUseCase(registry, configRepository, pluginLoader, artifactParser, artifactWriter),
		new InitializeUseCase(registry, pluginLoader, agentConfigDirWriter),
		new ImportUseCase(configRepository, pluginLoader, artifactParser, agentConfigDirWriter),
		new TranslateUseCase(registry, pluginLoader, artifactWriter),
		new ListTargetsUseCase(registry, pluginLoader),
	);
}
