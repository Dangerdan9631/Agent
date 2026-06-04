import path from 'node:path';

import type {
  AttachEventTerminate,
  AttachRequest,
  AttachServerEventSink,
  GetStatsRequest,
  GetStatsResponse,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-sdk/api';
import { createConfigOptions } from 'overmind-sdk/config';
import { OvermindIpcApi } from 'overmind-sdk/ipc/overmind-ipc-api';
import { BufferedLogBuffer, BufferedLoggerFactory, LogLevel } from 'overmind-sdk/logging';
import { injectable } from 'tsyringe';

import { CerebrateRegistry } from '../application/cerebrate-registry.js';
import type { OutputSink } from '../application/ports/output-sink.js';
import { AttachToOutputUseCase } from '../application/use-cases/attach-to-output.js';
import { SendCerebrateCommandUseCase } from '../application/use-cases/send-cerebrate-command.js';
import { StartCerebrateUseCase } from '../application/use-cases/start-cerebrate.js';
import { StopCerebrateUseCase } from '../application/use-cases/stop-cerebrate.js';
import type { Cerebrate } from '../domain/cerebrate/cerebrate.js';
import { ensureDefaultCerebrateConfig } from '../infrastructure/config/cerebrate-config-loader.js';
import { ensureOvermindConfig } from '../infrastructure/config/overmind-config-loader.js';
import { FileSystemTaskRepository } from '../infrastructure/persistence/file-system-task-repository.js';
import { OvermindIpcServer } from './overmind-ipc-server';

@injectable()
export class OvermindService implements OvermindIpcApi {
  private startedAt = 0;
  private configDir: string | undefined;
  private readonly outputBuffer = new BufferedLogBuffer();
  private readonly loggerFactory = new BufferedLoggerFactory(this.outputBuffer);
  private readonly registry = new CerebrateRegistry<Cerebrate>();

  constructor(private readonly ipcServer: OvermindIpcServer) {}

  async run(argv: string[], exposedApi: OvermindIpcApi = this): Promise<number> {
    const configOptions = createConfigOptions(argv[2]);
    this.configDir = configOptions.resolvedConfigDir;
    ensureOvermindConfig(configOptions.resolvedConfigDir);
    ensureDefaultCerebrateConfig(path.join(configOptions.resolvedConfigDir, 'cerebrates', 'hello'));
    this.startedAt = Date.now();
    this.emitGlobal(`service starting for ${configOptions.instanceName}`);

    try {
      await this.ipcServer.run(exposedApi, configOptions);
      return 0;
    } catch {
      this.startedAt = 0;
      return 1;
    }
  }

  async getStats(_request: GetStatsRequest): Promise<GetStatsResponse> {
    const cerebrates = this.registry.values().map((cerebrate) => cerebrate.getStats());
    return {
      uptime: this.startedAt === 0 ? 0 : (Date.now() - this.startedAt) / 1000,
      runningCerebrateCount: cerebrates.length,
      cerebrates,
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
    this.startedAt = 0;
    this.emitGlobal('service shutting down');

    return { message: 'Overmind service is shutting down.' };
  }

  stop(): void {
    this.ipcServer.stop();
  }

  async attach(
    request: AttachRequest,
    serverEvents: AttachServerEventSink,
    onDisconnect: (disconnect: () => void) => void,
    onTerminate: (terminate: (event: AttachEventTerminate) => Promise<void>) => void,
  ): Promise<void> {
    const attachToOutput = new AttachToOutputUseCase(
      this.outputBuffer,
      this.loggerFactory.create('AttachToOutputUseCase'),
    );

    await attachToOutput.execute(request, serverEvents, onDisconnect, onTerminate);
  }

  async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    const useCase = new StartCerebrateUseCase(
      this.requireConfigDir(),
      this.registry,
      new FileSystemTaskRepository(this.requireConfigDir()),
      this.outputBuffer,
    );
    const response = await useCase.execute(request);
    this.emitGlobal(`cerebrate started: ${response.name}`);
    return response;
  }

  async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    const useCase = new StopCerebrateUseCase(this.registry);
    const response = await useCase.execute(request);
    this.emitGlobal(response.message);
    return response;
  }

  async sendCerebrateCommand(
    request: SendCerebrateCommandRequest,
  ): Promise<SendCerebrateCommandResponse> {
    const useCase = new SendCerebrateCommandUseCase(this.registry);
    const response = await useCase.execute(request);
    this.emitGlobal(`cerebrate command sent: ${request.cerebrateName}:${request.command}`);
    return response;
  }

  getOutputSink(): OutputSink {
    return this.outputBuffer;
  }

  private requireConfigDir(): string {
    if (!this.configDir) {
      throw new Error('Overmind service config directory is not initialized.');
    }

    return this.configDir;
  }

  private emitGlobal(line: string): void {
    this.outputBuffer.append({
      timestamp: new Date(),
      level: LogLevel.Info,
      category: 'overmind-service',
      line,
    });
  }
}
