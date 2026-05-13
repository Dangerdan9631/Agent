import {
  createMachine,
  guard,
  immediate,
  interpret,
  invoke,
  state,
  transition,
  type Machine,
  type Service,
} from 'robot3';
import type { CerebrateConfig } from './config/cerebrate-config.js';
import type { LlmChain } from './llm/index.js';
import { BufferedLogBuffer } from './logging/index.js';
import { LogLevel } from './logging/logger.js';
import { completeTask, getAvailableTasks, saveTask, startTask, type Task } from './tasks.js';

export type CerebrateState = 'initialize' | 'idle' | 'check-tasks' | 'post-check' | 'work' | 'validate' | 'shutting down';

export interface CerebrateStats {
  name: string;
  idleLoopCount: number;
  runtime: number;
  state: CerebrateState;
}

const IDLE_SLEEP_MS = 10_000;

type CerebrateMachine = Machine<any, Record<string, never>>;
type CerebrateMachineService = Service<CerebrateMachine>;

export class Cerebrate {
  readonly name: string;
  readonly #abortController = new AbortController();
  readonly #startedAt = Date.now();
  #idleLoopCount = 0;
  #service: CerebrateMachineService | undefined;
  readonly #machine: CerebrateMachine;
  readonly #config: CerebrateConfig;
  readonly #configDir: string;
  readonly #llmChain: LlmChain;
  readonly #logBuffer: BufferedLogBuffer;
  #currentTask: Task | undefined;

  constructor(name: string, config: CerebrateConfig, configDir: string, llmChain: LlmChain, logBuffer: BufferedLogBuffer) {
    this.name = name;
    this.#config = config;
    this.#configDir = configDir;
    this.#llmChain = llmChain;
    this.#logBuffer = logBuffer;
    this.#machine = createMachine(
      'initialize',
      {
        idle: invoke(
          () => this.#idle(),
          transition('done', 'idle'),
          transition('check-tasks', 'check-tasks'),
          transition('stop', 'shutting down'),
        ),
        'check-tasks': invoke(
          () => this.#checkTasks(),
          transition('done', 'post-check'),
          transition('stop', 'shutting down'),
        ),
        'post-check': state(
          immediate('work', guard(() => this.#currentTask !== undefined)),
          immediate('idle'),
        ),
        work: invoke(
          () => this.#work(),
          transition('done', 'validate'),
          transition('stop', 'shutting down'),
        ),
        validate: invoke(
          () => this.#validate(),
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
    this.#service ??= interpret(this.#machine, () => { });
  }

  async stop(): Promise<void> {
    this.#abortController.abort();
    this.#service?.send('stop');
  }

  getStats(): CerebrateStats {
    return {
      name: this.name,
      idleLoopCount: this.#idleLoopCount,
      runtime: (Date.now() - this.#startedAt) / 1000,
      state: this.#state,
    };
  }

  subscribeOutput(listener: (line: string) => void): () => void {
    return this.#logBuffer.subscribe((event) => {
      listener(event.line);
    }, undefined, this.name);
  }

  async sendCommand(commandName: string): Promise<string> {
    if (commandName === 'check-tasks') {
      return this.#sendCheckTasksCommand();
    }

    const cmd = this.#config.commands.find((c) => c.name === commandName);
    if (!cmd) {
      this.#emit(`[${this.name}] >>> ${commandName}`);
      const output = await this.#llmChain.run({
        prompt: commandName,
        context: '',
        difficulty: 'low',
        thinking: 'none',
      });
      this.#emit(`[${this.name}] <<< ${output}`);
      return output;
    }

    const output = cmd.value;
    this.#emit(JSON.stringify(output));
    return JSON.stringify(output);
  }

  get #state(): CerebrateState {
    return (this.#service?.machine.current ?? 'initialize') as CerebrateState;
  }

  async #idle(): Promise<void> {
    this.#idleLoopCount += 1;
    this.#emit(`[${this.name}] idle loop ${this.#idleLoopCount}`);
    await sleep(IDLE_SLEEP_MS, this.#abortController.signal);
  }

  async #checkTasks(): Promise<void> {
    this.#emit(`[${this.name}] checking tasks for ${this.#config.taskId}`);
    const [task] = getAvailableTasks(this.#configDir, this.#config.taskId);

    if (!task) {
      this.#currentTask = undefined;
      this.#emit(`[${this.name}] no available tasks`);
      return;
    }

    this.#currentTask = task.status === 'open' ? startTask(this.#configDir, task.id) : task;
    this.#emit(`[${this.name}] selected task ${this.#currentTask.id}`);
  }

  async #work(): Promise<void> {
    const task = this.#currentTask;
    if (!task) {
      this.#emit(`[${this.name}] no current task to work`);
      return;
    }

    task.status = 'validating';
    task.updatedAt = new Date().toISOString();
    saveTask(this.#configDir, task);
    this.#emit(`[${this.name}] task ${task.id} marked validating`);
  }

  async #validate(): Promise<void> {
    const task = this.#currentTask;
    if (!task) {
      this.#emit(`[${this.name}] no current task to validate`);
      return;
    }

    completeTask(this.#configDir, task.id);
    this.#emit(`[${this.name}] task ${task.id} complete`);
    this.#currentTask = undefined;
  }

  #sendCheckTasksCommand(): string {
    if (this.#state !== 'idle') {
      const output = `Cannot check tasks while cerebrate "${this.name}" is in state "${this.#state}".`;
      this.#emit(output);
      return output;
    }

    const output = `Checking tasks for cerebrate "${this.name}".`;
    this.#emit(output);
    this.#service?.send('check-tasks');
    return output;
  }

  #emit(line: string): void {
    this.#logBuffer.append({
      timestamp: new Date().toISOString(),
      level: LogLevel.Info,
      category: this.name,
      line,
    }, this.name);
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
