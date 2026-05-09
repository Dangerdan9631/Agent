import fs from 'node:fs';
import path from 'node:path';
import type {
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateRequest,
  StopCerebrateResponse,
} from 'overmind-api';
import { inject, singleton } from 'tsyringe';
import { Cerebrate, type CerebrateStats } from '../cerebrate.js';
import { loadCerebrateConfig } from '../config/cerebrate-config.js';
import { LlmChain } from '../llm/index.js';
import { type OvermindConfig, OvermindConfigToken } from '../config/overmind-config.js';

@singleton()
export class CerebrateController {
  readonly #cerebrates = new Map<string, Cerebrate>();

  constructor(
    @inject(OvermindConfigToken) readonly config: OvermindConfig,
    @inject(LlmChain) private readonly llmChain: LlmChain,
  ) {}

  getRunningStats(): CerebrateStats[] {
    return Array.from(this.#cerebrates.values(), (cerebrate) => cerebrate.getStats());
  }

  async stopAll(): Promise<void> {
    await Promise.all(Array.from(this.#cerebrates.values(), (cerebrate) => cerebrate.stop()));
    this.#cerebrates.clear();
  }

  async startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    const { name } = request;

    if (this.#cerebrates.has(name)) {
      throw new Error(`Cerebrate "${name}" is already running. Only one instance per name is allowed.`);
    }

    const definitionDir = path.join(this.config.configDir, 'cerebrates', name);
    if (!fs.existsSync(definitionDir) || !fs.statSync(definitionDir).isDirectory()) {
      throw new Error(`No cerebrate definition folder for "${name}" under cerebrates/.`);
    }

    const cerebrateConfig = loadCerebrateConfig(definitionDir, false);
    const cerebrate = new Cerebrate(name, cerebrateConfig, this.config.configDir, this.llmChain);

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

  async sendCerebrateCommand(
    request: SendCerebrateCommandRequest,
  ): Promise<SendCerebrateCommandResponse> {
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
