import path from 'node:path';

import { getOvermindPipePath } from 'overmind-core';

import { RpcConnectionHandler } from '../adapters/rpc/rpc-connection-handler.js';
import { RpcServer } from '../adapters/rpc/rpc-server.js';
import { CerebrateRegistry } from '../application/cerebrate-registry.js';
import { AttachToOutputUseCase } from '../application/use-cases/attach-to-output.js';
import { GetServiceStatsUseCase } from '../application/use-cases/get-service-stats.js';
import { SendCerebrateCommandUseCase } from '../application/use-cases/send-cerebrate-command.js';
import { ShutdownServiceUseCase } from '../application/use-cases/shutdown-service.js';
import { StartCerebrateUseCase } from '../application/use-cases/start-cerebrate.js';
import { StopAllCerebratesUseCase } from '../application/use-cases/stop-all-cerebrates.js';
import { StopCerebrateUseCase } from '../application/use-cases/stop-cerebrate.js';
import { Cerebrate } from '../domain/cerebrate/cerebrate.js';
import { ensureDefaultCerebrateConfig,FileSystemCerebrateDefinitionReader } from '../infrastructure/config/cerebrate-config-loader.js';
import { ensureOvermindConfig, loadOvermindConfig } from '../infrastructure/config/overmind-config-loader.js';
import { createLlmRunner } from '../infrastructure/llm/provider-chain-runner.js';
import { FileSystemTaskRepository } from '../infrastructure/persistence/file-system-task-repository.js';
import { BufferedLogBuffer } from '../logging/buffered-logger.js';
import { BufferedLoggerFactory } from '../logging/buffered-logger-factory.js';

export interface OvermindServiceRuntime {
  server: RpcServer;
}

export function buildOvermindRuntime(configDir: string): OvermindServiceRuntime {
  ensureOvermindConfig(configDir);
  ensureDefaultCerebrateConfig(path.join(configDir, 'cerebrates', 'hello'));

  const overmindConfig = loadOvermindConfig(configDir);
  const logBuffer = new BufferedLogBuffer();
  const loggerFactory = new BufferedLoggerFactory(logBuffer);
  const taskRepository = new FileSystemTaskRepository(configDir);
  const definitionReader = new FileSystemCerebrateDefinitionReader();
  const llmRunner = createLlmRunner(overmindConfig.llm);
  const registry = new CerebrateRegistry<Cerebrate>();

  const attachToOutput = new AttachToOutputUseCase(logBuffer, loggerFactory.create('AttachToOutputUseCase'));
  const getServiceStats = new GetServiceStatsUseCase(registry, loggerFactory.create('GetServiceStatsUseCase'));
  const sendCerebrateCommand = new SendCerebrateCommandUseCase(registry);
  const stopAllCerebrates = new StopAllCerebratesUseCase(registry, loggerFactory.create('StopAllCerebratesUseCase'));
  const shutdownService = new ShutdownServiceUseCase(stopAllCerebrates, loggerFactory.create('ShutdownServiceUseCase'));
  const startCerebrate = new StartCerebrateUseCase(configDir, definitionReader, registry, taskRepository, llmRunner, logBuffer);
  const stopCerebrate = new StopCerebrateUseCase(registry);

  const connectionHandler = new RpcConnectionHandler(
    attachToOutput,
    getServiceStats,
    sendCerebrateCommand,
    shutdownService,
    startCerebrate,
    stopCerebrate,
    loggerFactory,
  );

  return {
    server: new RpcServer(getOvermindPipePath(configDir), connectionHandler.handleConnection.bind(connectionHandler), loggerFactory),
  };
}
