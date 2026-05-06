import { EventEmitter } from 'node:events';
import {
  createMachine,
  immediate,
  interpret,
  invoke,
  state,
  transition,
  type Machine,
  type Service,
} from 'robot3';
import type { ResolvedCerebrateConfig } from './config.js';

export type CerebrateState = 'initialize' | 'idle' | 'shutting down';

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
  readonly #config: ResolvedCerebrateConfig;
  readonly #output = new EventEmitter();

  constructor(name: string, config: ResolvedCerebrateConfig) {
    this.name = name;
    this.#config = config;
    this.#machine = createMachine(
      'initialize',
      {
        idle: invoke(
          () => this.#idle(),
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
    this.#output.removeAllListeners('line');
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
    this.#output.on('line', listener);
    return () => {
      this.#output.off('line', listener);
    };
  }

  sendCommand(commandName: string): string {
    const cmd = this.#config.commands.find((c) => c.name === commandName);
    if (!cmd) {
      throw new Error(`Unknown command for cerebrate "${this.name}": ${commandName}`);
    }

    const output = cmd.value;
    this.#output.emit('line', output);
    return output;
  }

  get #state(): CerebrateState {
    return (this.#service?.machine.current ?? 'initialize') as CerebrateState;
  }

  async #idle(): Promise<void> {
    this.#idleLoopCount += 1;
    await sleep(IDLE_SLEEP_MS, this.#abortController.signal);
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
