import type { RuntimeInvocation } from 'spec-n-roll-api';

/**
 * Parses and validates dispatcher invocation payloads.
 */
export class RuntimeInvocationParser {
  /**
   * Parses a serialized dispatcher invocation.
   *
   * @param input - UTF-8 JSON text supplied by the dispatcher.
   * @returns Parsed runtime invocation.
   */
  parse(input: string): RuntimeInvocation {
    if (input.trim() === '') {
      throw new Error('Runtime invocation stdin was empty.');
    }

    const parsed = JSON.parse(input) as unknown;

    if (!this.isRuntimeInvocation(parsed)) {
      throw new Error(
        'Runtime invocation stdin did not match the dispatcher schema.',
      );
    }

    return parsed;
  }

  /**
   * Checks whether an unknown value has the runtime invocation shape.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies the required invocation fields.
   */
  private isRuntimeInvocation(value: unknown): value is RuntimeInvocation {
    if (value == null || typeof value !== 'object') {
      return false;
    }

    const candidate = value as {
      argv?: unknown;
      dispatcher?: unknown;
      cwd?: unknown;
      projectRoot?: unknown;
    };

    return (
      Array.isArray(candidate.argv) &&
      candidate.argv.every((argument) => typeof argument === 'string') &&
      this.isDispatcherMetadata(candidate.dispatcher) &&
      typeof candidate.cwd === 'string' &&
      (candidate.projectRoot == null ||
        typeof candidate.projectRoot === 'string')
    );
  }

  /**
   * Checks whether an unknown value has dispatcher metadata fields.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies dispatcher metadata fields.
   */
  private isDispatcherMetadata(value: unknown): boolean {
    if (value == null || typeof value !== 'object') {
      return false;
    }

    const candidate = value as {
      installSource?: unknown;
      installDirectory?: unknown;
      packageVersion?: unknown;
    };

    return (
      (candidate.installSource === 'remote' ||
        candidate.installSource === 'local') &&
      typeof candidate.installDirectory === 'string' &&
      typeof candidate.packageVersion === 'string'
    );
  }
}
