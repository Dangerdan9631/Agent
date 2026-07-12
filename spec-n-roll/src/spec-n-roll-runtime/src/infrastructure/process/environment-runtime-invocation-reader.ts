import { RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE } from 'spec-n-roll-api';
import type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';

/**
 * Reads dispatcher invocation JSON without consuming the terminal input stream.
 */
export class EnvironmentRuntimeInvocationReader implements RuntimeInvocationReader {
  /**
   * Reads the invocation value from the private child-process environment entry.
   *
   * @returns Invocation JSON or an empty string when the dispatcher did not provide it.
   */
  read(): string {
    return process.env[RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE] ?? '';
  }
}
