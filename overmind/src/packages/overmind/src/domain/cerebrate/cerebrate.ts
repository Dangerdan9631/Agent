import type { CerebrateStats } from 'overmind-sdk/api';
import { LogLevel } from 'overmind-sdk/logging';
import {
  createMachine,
  guard,
  immediate,
  interpret,
  invoke,
  type Machine,
  type Service,
  state,
  transition,
} from 'robot3';

import type { OutputSink } from '../../application/ports/output-sink.js';
import type { TaskRepository } from '../../application/ports/task-repository.js';
import type { Task } from '../task/task.js';
import type { CerebrateDefinition } from './cerebrate-definition.js';

type CerebrateMachine = Machine<Record<string, never>, Record<string, never>>;
type CerebrateMachineService = Service<CerebrateMachine>;

const IDLE_SLEEP_MS = 10_000;

export class Cerebrate {
  readonly name: string;
  private readonly abortController = new AbortController();
  private readonly startedAt = Date.now();
  private readonly machine: CerebrateMachine;
  private currentTask: Task | undefined;
  private idleLoopCount = 0;
  private service: CerebrateMachineService | undefined;

  constructor(
    private readonly definition: CerebrateDefinition,
    private readonly taskRepository: TaskRepository,
    private readonly outputSink: OutputSink,
  ) {
    this.name = definition.name;
    this.machine = createMachine(
      'initialize',
      {
        idle: invoke(
          () => this.idle(),
          transition('done', 'idle'),
          transition('check-tasks', 'check-tasks'),
          transition('stop', 'shutting down'),
        ),
        'check-tasks': invoke(
          () => this.checkTasks(),
          transition('done', 'post-check'),
          transition('stop', 'shutting down'),
        ),
        'post-check': state(
          immediate('work', guard(() => this.currentTask !== undefined)),
          immediate('idle'),
        ),
        work: invoke(
          () => this.work(),
          transition('done', 'validate'),
          transition('stop', 'shutting down'),
        ),
        validate: invoke(
          () => this.validate(),
          transition('done', 'idle'),
          transition('stop', 'shutting down'),
        ),
        initialize: state(immediate('idle')),
        'shutting down': state(),
      },
      () => ({}),
    );
  }

  start(): void {
    this.service ??= interpret(this.machine, () => undefined);
  }

  async stop(): Promise<void> {
    this.abortController.abort();
    this.service?.send('stop');
    this.emit(`[${this.name}] stopping`);
  }

  getStats(): CerebrateStats {
    return {
      name: this.name,
      idleLoopCount: this.idleLoopCount,
      runtime: (Date.now() - this.startedAt) / 1000,
      state: this.state,
    };
  }

  async sendCommand(commandName: string): Promise<string> {
    if (commandName === 'check-tasks') {
      return this.sendCheckTasksCommand();
    }

    const command = this.definition.commands.find((candidate) => candidate.name === commandName);
    if (!command) {
      const output = `Unknown command "${commandName}" for cerebrate "${this.name}".`;
      this.emit(output);
      return output;
    }

    const output = JSON.stringify(command.value);
    this.emit(output);
    return output;
  }

  private get state(): CerebrateStats['state'] {
    return (this.service?.machine.current ?? 'initialize') as CerebrateStats['state'];
  }

  private async idle(): Promise<void> {
    this.idleLoopCount += 1;
    this.emit(`[${this.name}] idle loop ${this.idleLoopCount}`);
    await sleep(IDLE_SLEEP_MS, this.abortController.signal);
  }

  private async checkTasks(): Promise<void> {
    this.emit(`[${this.name}] checking tasks for ${this.definition.taskId}`);
    const [task] = this.taskRepository.findAvailableFor(this.definition.taskId);

    if (!task) {
      this.currentTask = undefined;
      this.emit(`[${this.name}] no available tasks`);
      return;
    }

    if (task.status === 'open') {
      task.begin(new Date().toISOString());
      this.taskRepository.save(task);
    }

    this.currentTask = task;
    this.emit(`[${this.name}] selected task ${task.id}`);
  }

  private async work(): Promise<void> {
    const task = this.currentTask;
    if (!task) {
      this.emit(`[${this.name}] no current task to work`);
      return;
    }

    task.markValidating(new Date().toISOString());
    this.taskRepository.save(task);
    this.emit(`[${this.name}] task ${task.id} marked validating`);
  }

  private async validate(): Promise<void> {
    const task = this.currentTask;
    if (!task) {
      this.emit(`[${this.name}] no current task to validate`);
      return;
    }

    task.complete(new Date().toISOString());
    this.taskRepository.save(task);
    this.emit(`[${this.name}] task ${task.id} complete`);
    this.currentTask = undefined;
  }

  private sendCheckTasksCommand(): string {
    if (this.state !== 'idle') {
      const output = `Cannot check tasks while cerebrate "${this.name}" is in state "${this.state}".`;
      this.emit(output);
      return output;
    }

    const output = `Checking tasks for cerebrate "${this.name}".`;
    this.emit(output);
    this.service?.send('check-tasks');
    return output;
  }

  private emit(line: string): void {
    this.outputSink.append(
      {
        timestamp: new Date(),
        level: LogLevel.Info,
        category: this.name,
        line,
      },
      this.name,
    );
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}
