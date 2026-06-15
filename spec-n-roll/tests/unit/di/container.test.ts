import { beforeEach, describe, expect, it } from 'vitest';
import { inject, injectable, type InjectionToken } from 'tsyringe';

import {
  registerApplicationServices,
  resetApplicationContainer,
  rootContainer,
} from '../../../src/di/container.js';

/**
 * Test token for explicit constructor injection in DI smoke tests.
 */
const GREETING_TOKEN: InjectionToken<string> = Symbol('GREETING_TOKEN');

@injectable()
class GreetingProvider {
  /**
   * Returns a fixed greeting string for wiring assertions.
   *
   * @returns Greeting text used by dependent services.
   */
  getGreeting(): string {
    return 'hello';
  }
}

@injectable()
class GreetingConsumer {
  /**
   * Creates a consumer that depends on a greeting provider and injected label.
   *
   * @param provider - Service supplying greeting text.
   * @param label - Injected label token value.
   */
  constructor(
    @inject(GreetingProvider) private readonly provider: GreetingProvider,
    @inject(GREETING_TOKEN) private readonly label: string,
  ) {}

  /**
   * Combines provider output with the injected label.
   *
   * @returns Formatted greeting message.
   */
  formatMessage(): string {
    return `${this.provider.getGreeting()}:${this.label}`;
  }
}

describe('dependency injection container', () => {
  beforeEach(() => {
    resetApplicationContainer();
  });

  it('resolves injectable classes with explicit token injection', () => {
    rootContainer.register(GREETING_TOKEN, { useValue: 'spec-n-roll' });

    const consumer = rootContainer.resolve(GreetingConsumer);

    expect(consumer.formatMessage()).toBe('hello:spec-n-roll');
  });

  it('allows registerApplicationServices to be called multiple times safely', () => {
    registerApplicationServices();
    registerApplicationServices();

    rootContainer.register(GREETING_TOKEN, { useValue: 'idempotent' });
    const consumer = rootContainer.resolve(GreetingConsumer);

    expect(consumer.formatMessage()).toBe('hello:idempotent');
  });
});
