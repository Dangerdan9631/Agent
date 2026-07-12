import { InkRuntimeUiRenderer } from '#runtime/infrastructure/ink/ink-runtime-ui-renderer.jsx';
import { RuntimeApplication } from '#runtime/application/runtime/runtime-application.js';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import { EnvironmentRuntimeInvocationReader } from '#runtime/infrastructure/process/environment-runtime-invocation-reader.js';

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
      new EnvironmentRuntimeInvocationReader(),
      new RuntimeInvocationParser(),
      new InkRuntimeUiRenderer(),
    );
  }
}
