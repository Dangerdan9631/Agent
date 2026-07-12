import { Logger } from 'tslog';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';
import type { RuntimeUiRenderer } from '#runtime/application/ui/runtime-ui-renderer.js';
import { RuntimeUiModeResolver } from '#runtime/application/ui/runtime-ui-mode-resolver.js';

/**
 * Runs the runtime stub implementation.
 */
export class RuntimeApplication {
  /**
   * Creates a runtime application.
   *
   * @param reader - Input reader for dispatcher invocation JSON.
   * @param parser - Parser and validator for invocation payloads.
   * @param renderer - Interactive terminal UI presentation boundary.
   * @param modeResolver - Resolver for global and local home selection.
   * @param logger - Logger used to report the invocation configuration received.
   */
  constructor(
    private readonly reader: RuntimeInvocationReader,
    private readonly parser: RuntimeInvocationParser,
    private readonly renderer: RuntimeUiRenderer,
    private readonly modeResolver = new RuntimeUiModeResolver(),
    private readonly logger = new Logger({
      name: 'spec-n-roll-runtime',
      minLevel: 6,
    }),
  ) {}

  /**
   * Executes the runtime stub by printing the dispatcher invocation.
   */
  async run(): Promise<void> {
    const invocation = this.parser.parse(this.reader.read());
    this.logger.debug('Received dispatcher invocation.', {
      argv: invocation.argv,
      cwd: invocation.cwd,
      projectRoot: invocation.projectRoot,
      dispatcherInstallSource: invocation.dispatcher.installSource,
    });
    const mode = this.modeResolver.resolve(invocation);
    this.logger.debug('Launching interactive runtime UI.', { mode });
    await this.renderer.render(mode);
  }
}
