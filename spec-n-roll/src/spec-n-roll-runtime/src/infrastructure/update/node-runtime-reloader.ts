import type { RuntimeReloader } from '#runtime/application/update/runtime-reloader.js';

/**
 * Ends the current runtime so its parent dispatcher can resolve and launch the updated runtime.
 */
export class NodeRuntimeReloader implements RuntimeReloader {
  /**
   * Exits with the dispatcher-owned reload code without opening another terminal.
   */
  reload(): void {
    process.exit(75);
  }
}
