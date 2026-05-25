import { ShutdownError } from 'overmind-api';
import type { Logger } from 'overmind-core';
import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';

const DEFAULT_STOP_TIMEOUT_MS = 15_000;

export class StopAllCerebratesUseCase {
  constructor(
    private readonly registry: CerebrateRegistry<Cerebrate>,
    private readonly logger: Logger,
    private readonly timeoutMs = DEFAULT_STOP_TIMEOUT_MS,
  ) {}

  async execute(): Promise<void> {
    const running = this.registry.values();
    if (running.length === 0) {
      return;
    }

    this.logger.info('stopping cerebrates', running.length);

    await withTimeout(
      Promise.all(running.map((cerebrate) => cerebrate.stop())),
      this.timeoutMs,
      `Timed out while stopping cerebrates after ${this.timeoutMs}ms.`,
    );

    this.registry.clear();
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new ShutdownError(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
