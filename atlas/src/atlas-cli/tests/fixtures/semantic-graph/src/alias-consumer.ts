import type { BaseContract } from '@contracts';

/**
 * Exercises configured TypeScript path-alias resolution into a backing declaration.
 */
export class AliasConsumer implements BaseContract {
  /**
   * Provides a fixture name for contract conformance.
   */
  public readonly name = 'alias';
}
