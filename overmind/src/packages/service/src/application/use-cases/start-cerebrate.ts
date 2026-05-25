import fs from 'node:fs';
import path from 'node:path';
import type { StartCerebrateRequest, StartCerebrateResponse } from 'overmind-api';
import { StartCerebrateError } from 'overmind-api';
import { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import type { CerebrateDefinitionReader } from '../ports/cerebrate-definition-reader.js';
import type { LlmRunner } from '../ports/llm-runner.js';
import type { OutputSink } from '../ports/output-sink.js';
import type { TaskRepository } from '../ports/task-repository.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

export class StartCerebrateUseCase {
  constructor(
    private readonly configDir: string,
    private readonly definitionReader: CerebrateDefinitionReader,
    private readonly registry: CerebrateRegistry<Cerebrate>,
    private readonly taskRepository: TaskRepository,
    private readonly llmRunner: LlmRunner,
    private readonly outputSink: OutputSink,
  ) {}

  async execute(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    if (this.registry.has(request.name)) {
      throw new StartCerebrateError(`Cerebrate "${request.name}" is already running. Only one instance per name is allowed.`);
    }

    const definitionDir = path.join(this.configDir, 'cerebrates', request.name);
    if (!fs.existsSync(definitionDir) || !fs.statSync(definitionDir).isDirectory()) {
      throw new StartCerebrateError(`No cerebrate definition folder for "${request.name}" under cerebrates/.`);
    }

    const definition = this.definitionReader.read(definitionDir);
    const cerebrate = new Cerebrate(definition, this.taskRepository, this.llmRunner, this.outputSink);
    this.registry.add(cerebrate);
    cerebrate.start();
    return { name: cerebrate.name };
  }
}
