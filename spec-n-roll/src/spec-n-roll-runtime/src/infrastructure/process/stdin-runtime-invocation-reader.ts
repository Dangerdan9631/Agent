import { readFileSync } from 'node:fs';
import type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';

/**
 * Reads dispatcher invocation JSON from process stdin.
 */
export class StdinRuntimeInvocationReader implements RuntimeInvocationReader {
  /**
   * Reads the complete stdin stream as UTF-8 text.
   *
   * @returns UTF-8 stdin contents.
   */
  read(): string {
    return readFileSync(0, 'utf8');
  }
}
