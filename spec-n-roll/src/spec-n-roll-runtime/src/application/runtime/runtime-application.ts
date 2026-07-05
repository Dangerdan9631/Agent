import { Logger } from 'tslog';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';
import type { RuntimeOutputWriter } from '#runtime/application/output/runtime-output-writer.js';

/**
 * Runs the runtime stub implementation.
 */
export class RuntimeApplication {
  /**
   * Creates a runtime application.
   *
   * @param reader - Input reader for dispatcher invocation JSON.
   * @param parser - Parser and validator for invocation payloads.
   * @param writer - Output writer for rendered invocation data.
   * @param logger - Logger used to report the invocation configuration received.
   */
  constructor(
    private readonly reader: RuntimeInvocationReader,
    private readonly parser: RuntimeInvocationParser,
    private readonly writer: RuntimeOutputWriter,
    private readonly logger = new Logger({
      name: 'spec-n-roll-runtime',
      minLevel: 6,
    }),
  ) {}

  /**
   * Executes the runtime stub by printing the dispatcher invocation.
   */
  run(): void {
    const invocation = this.parser.parse(this.reader.read());
    this.logger.debug('Received dispatcher invocation.', {
      argv: invocation.argv,
      cwd: invocation.cwd,
      projectRoot: invocation.projectRoot,
      dispatcherInstallSource: invocation.dispatcher.installSource,
    });
    this.writer.writeLine(JSON.stringify(invocation, null, 2));
  }
}
