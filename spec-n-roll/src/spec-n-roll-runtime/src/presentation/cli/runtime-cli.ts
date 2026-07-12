import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger } from 'tslog';
import { RuntimeCompositionRoot } from '#runtime/composition/runtime/runtime-composition-root.js';
import { RuntimeProgramFactory } from '#runtime/composition/runtime/runtime-program-factory.js';

/**
 * Owns runtime command-line parsing and entrypoint detection.
 */
export class RuntimeCli {
  /**
   * Creates runtime command-line wiring.
   *
   * @param compositionRoot - Factory for process-backed runtime dependencies.
   * @param programFactory - Factory for the Commander runtime program.
   * @param logger - Logger used to report fatal entrypoint errors.
   */
  constructor(
    private readonly compositionRoot = new RuntimeCompositionRoot(),
    private readonly programFactory = new RuntimeProgramFactory(),
    private readonly logger = new Logger({
      name: 'spec-n-roll-runtime',
      minLevel: 6,
    }),
  ) {}

  /**
   * Runs the internal runtime executable.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  async run(argv: readonly string[] = process.argv): Promise<void> {
    await this.programFactory
      .create(this.compositionRoot.createApplication())
      .parseAsync([...argv]);
  }

  /**
   * Runs the CLI when the supplied module URL is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module that owns the check.
   * @param argv - Process argument vector including executable and script path.
   */
  async runIfMain(moduleUrl: string, argv: readonly string[] = process.argv): Promise<void> {
    if (!this.isMainModule(moduleUrl, argv)) {
      return;
    }

    try {
      await this.run(argv);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(message);
      process.exitCode = 1;
    }
  }

  /**
   * Checks whether a module is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module to inspect.
   * @param argv - Process argument vector including executable and script path.
   * @returns true when the module path matches the process script path.
   */
  private isMainModule(
    moduleUrl: string,
    argv: readonly string[] = process.argv,
  ): boolean {
    if (argv[1] == null) {
      return false;
    }

    try {
      return (
        realpathSync(fileURLToPath(moduleUrl)) ===
        realpathSync(resolve(argv[1]))
      );
    } catch {
      return false;
    }
  }
}
