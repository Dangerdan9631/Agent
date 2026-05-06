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

export type CerebrateState = 'initialize' | 'idle' | 'shutting down';

export interface CerebrateStats {
  id: string;
  idleLoopCount: number;
  runtime: number;
  state: CerebrateState;
}

const IDLE_SLEEP_MS = 10_000;

type CerebrateMachine = Machine<any, Record<string, never>>;
type CerebrateMachineService = Service<CerebrateMachine>;

export class Cerebrate {
  readonly id: string;
  readonly #abortController = new AbortController();
  readonly #startedAt = Date.now();
  #idleLoopCount = 0;
  #service: CerebrateMachineService | undefined;
  readonly #machine: CerebrateMachine;

  constructor(id: string) {
    this.id = id;
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
    this.#service ??= interpret(this.#machine, () => {});
  }

  async stop(): Promise<void> {
    this.#abortController.abort();
    this.#service?.send('stop');
  }

  getStats(): CerebrateStats {
    return {
      id: this.id,
      idleLoopCount: this.#idleLoopCount,
      runtime: (Date.now() - this.#startedAt) / 1000,
      state: this.#state,
    };
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
