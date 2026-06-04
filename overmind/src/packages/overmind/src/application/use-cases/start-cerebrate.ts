import fs from 'node:fs';
import path from 'node:path';

import type { StartCerebrateRequest, StartCerebrateResponse } from 'overmind-sdk/api';
import { StartCerebrateError } from 'overmind-sdk/api';

import { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { loadCerebrateDefinition } from '../../infrastructure/config/cerebrate-config-loader.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';
import type { OutputSink } from '../ports/output-sink.js';
import type { TaskRepository } from '../ports/task-repository.js';

export class StartCerebrateUseCase {
  constructor(
    private readonly configDir: string,
    private readonly registry: CerebrateRegistry<Cerebrate>,
    private readonly taskRepository: TaskRepository,
    private readonly outputSink: OutputSink,
  ) {}

  async execute(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
    if (this.registry.has(request.name)) {
      throw new StartCerebrateError(
        `Cerebrate "${request.name}" is already running. Only one instance per name is allowed.`,
      );
    }

    const definitionDir = path.join(this.configDir, 'cerebrates', request.name);
    if (!fs.existsSync(definitionDir) || !fs.statSync(definitionDir).isDirectory()) {
      throw new StartCerebrateError(
        `No cerebrate definition folder for "${request.name}" under cerebrates/.`,
      );
    }

    const definition = loadCerebrateDefinition(definitionDir);
    const cerebrate = new Cerebrate(definition, this.taskRepository, this.outputSink);
    this.registry.add(cerebrate);
    cerebrate.start();
    return { name: cerebrate.name };
  }
}
