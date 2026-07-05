import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArchProgramFactory } from '#arch/arch-program-factory.js';

/**
 * Owns architecture executable command-line parsing.
 */
export class ArchCli {
  /**
   * Creates architecture command-line wiring.
   *
   * @param programFactory - Factory for the Commander architecture program.
   */
  constructor(private readonly programFactory = new ArchProgramFactory()) {}

  /**
   * Runs the architecture command line interface.
   *
   * @param argv - Process argument vector including the executable and script path.
   */
  run(argv: readonly string[] = process.argv): void {
    this.programFactory.create().parse([...argv]);
  }

  /**
   * Runs the CLI when the supplied module URL is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module that owns the check.
   * @param argv - Process argument vector including executable and script path.
   */
  runIfMain(moduleUrl: string, argv: readonly string[] = process.argv): void {
    if (this.isMainModule(moduleUrl, argv)) {
      this.run(argv);
    }
  }

  /**
   * Checks whether a module is being run as the process entry point.
   *
   * @param moduleUrl - Import metadata URL for the module to inspect.
   * @param argv - Process argument vector including executable and script path.
   * @returns true when this module path matches the current process script path.
   */
  private isMainModule(
    moduleUrl: string,
    argv: readonly string[] = process.argv,
  ): boolean {
    return (
      realpathSync(fileURLToPath(moduleUrl)) ===
      realpathSync(resolve(argv[1] ?? ''))
    );
  }
}
