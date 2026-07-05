import { Logger } from 'tslog';

/**
 * Emits package diagnostics for SDK behavior.
 */
export const sdkLogger = new Logger({ name: 'spec-n-roll-sdk', minLevel: 6 });

/**
 * Represents the core spec-n-roll business capability surface.
 */
export class SpecNRollSdk {
  /**
   * Returns the runtime package identity used by current executable stubs.
   *
   * @returns The runtime package name.
   */
  name(): string {
    return 'spec-n-roll-runtime';
  }

  /**
   * Returns the MCP package identity used by current executable stubs.
   *
   * @returns The MCP package name.
   */
  mcpName(): string {
    return 'spec-n-roll-mcp';
  }
}
