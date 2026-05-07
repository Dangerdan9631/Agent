import fs from 'node:fs';
import type {
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-api';
import { Cerebrate } from './cerebrate.js';
import {
  cerebrateDefinitionDir,
  loadOvermindConfig,
  loadResolvedCerebrateConfig,
  scaffoldDefaultConfig,
} from './config.js';
import { createLlmChain, type LlmChain } from './llm/index.js';

export class OvermindService implements OvermindApi {
  readonly #configDir: string;
  readonly #llmChain: LlmChain;
  readonly #cerebrates = new Map<string, Cerebrate>();

  constructor(configDir: string) {
    this.#configDir = configDir;
    scaffoldDefaultConfig(configDir);
    const config = loadOvermindConfig(configDir);
    this.#llmChain = createLlmChain(config.llm);
  }

  get configDir(): string {
    return this.#configDir;
  }

  async getServiceStats(_request: GetServiceStatsRequest): Promise<GetServiceStatsResponse> {
    const cerebrates = Array.from(this.#cerebrates.values(), (cerebrate) => cerebrate.getStats());

    return {
      uptime: process.uptime(),
      runningCerebrateCount: cerebrates.length,
      cerebrates,
    };
  }

  async shutdown(_request: ShutdownRequest): Promise<ShutdownResponse> {
    await Promise.all(Array.from(this.#cerebrates.values(), (cerebrate) => cerebrate.stop()));
    this.#cerebrates.clear();

    return {
      success: true,
      message: 'Service shutdown requested.',
    };
  }

  async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    const { name } = request;

    if (this.#cerebrates.has(name)) {
      throw new Error(`Cerebrate "${name}" is already running. Only one instance per name is allowed.`);
    }

    const definitionDir = cerebrateDefinitionDir(this.#configDir, name);
    if (!fs.existsSync(definitionDir) || !fs.statSync(definitionDir).isDirectory()) {
      throw new Error(`No cerebrate definition folder for "${name}" under cerebrates/.`);
    }

    const resolvedConfig = loadResolvedCerebrateConfig(definitionDir);
    const cerebrate = new Cerebrate(name, resolvedConfig, this.#configDir, this.#llmChain);

    this.#cerebrates.set(name, cerebrate);
    cerebrate.start();

    return { name };
  }

  async stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
    const cerebrate = this.#cerebrates.get(request.name);

    if (!cerebrate) {
      return {
        stopped: false,
        message: `Cerebrate not found: ${request.name}`,
      };
    }

    await cerebrate.stop();
    this.#cerebrates.delete(request.name);

    return {
      stopped: true,
      message: `Cerebrate stopped: ${request.name}`,
    };
  }

  async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
    const cerebrate = this.#cerebrates.get(request.name);

    if (!cerebrate) {
      throw new Error(`Cerebrate "${request.name}" is not running.`);
    }

    const output = await cerebrate.sendCommand(request.command);

    return { output };
  }

  subscribeCerebrateOutput(name: string, listener: (line: string) => void): () => void {
    const cerebrate = this.#cerebrates.get(name);
    if (!cerebrate) {
      throw new Error(`Cerebrate "${name}" is not running.`);
    }

    return cerebrate.subscribeOutput(listener);
  }
}
