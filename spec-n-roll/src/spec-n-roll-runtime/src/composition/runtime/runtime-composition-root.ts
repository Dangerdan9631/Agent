import { ConsoleRuntimeOutputWriter } from '#runtime/infrastructure/process/console-runtime-output-writer.js';
import { RuntimeApplication } from '#runtime/application/runtime/runtime-application.js';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import { StdinRuntimeInvocationReader } from '#runtime/infrastructure/process/stdin-runtime-invocation-reader.js';

/**
 * Wires process-backed runtime dependencies.
 */
export class RuntimeCompositionRoot {
  /**
   * Creates the default process-backed runtime application.
   *
   * @returns Runtime application wired to process stdin and stdout.
   */
  createApplication(): RuntimeApplication {
    return new RuntimeApplication(
      new StdinRuntimeInvocationReader(),
      new RuntimeInvocationParser(),
      new ConsoleRuntimeOutputWriter(),
    );
  }
}
