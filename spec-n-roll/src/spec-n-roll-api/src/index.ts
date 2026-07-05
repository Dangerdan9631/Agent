import { Logger } from 'tslog';

/**
 * Emits package diagnostics for the public API boundary.
 */
export const apiLogger = new Logger({ name: 'spec-n-roll-api', minLevel: 6 });

/**
 * Describes the argument payload passed across the dispatcher/runtime boundary.
 */
export interface RuntimeInvocation {
  /**
   * Ordered CLI arguments without the node executable or script path.
   */
  readonly argv: readonly string[];
}

/**
 * Describes a resolved runtime executable target.
 */
export interface RuntimeTarget {
  /**
   * Package name that owns the runtime executable. Must be an npm package name.
   */
  readonly packageName: string;

  /**
   * Executable command name used to launch the runtime process.
   */
  readonly commandName: string;
}
