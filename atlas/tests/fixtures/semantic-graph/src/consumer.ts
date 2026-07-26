import type { BaseContract } from './index.js';

/**
 * Exercises public re-export resolution through the package-local entry module.
 */
export class ReExportConsumer implements BaseContract {
  /**
   * Provides a fixture name for contract conformance.
   */
  public readonly name = 'consumer';
}
