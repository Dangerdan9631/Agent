import { Command } from 'commander';
import { DispatcherApplication } from '#dispatcher/application/dispatch/dispatcher-application.js';
import type { DispatcherCommandOptions } from '#dispatcher/application/dispatch/dispatcher-command-options.js';

/**
 * Owns dispatcher command-line parsing.
 */
export class DispatcherCli {
  /**
   * Creates dispatcher command-line wiring.
   *
   * @param application - Dispatcher application invoked by parsed commands.
   */
  constructor(private readonly application: DispatcherApplication) {}

  /**
   * Runs the public dispatcher executable.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  run(argv: readonly string[]): void {
    const dispatcherArguments = argv.slice(2);

    new Command()
      .name('spec-n-roll')
      .alias('snr')
      .description(
        'Dispatches spec-n-roll commands to a project-local or global runtime.',
      )
      .version('0.1.0')
      .option(
        '--global',
        'Run the globally installed runtime instead of a project-local copy',
      )
      .option('--root <path>', 'Project root directory to use for dispatch')
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .action((options: DispatcherCommandOptions) => {
        const exitCode = this.application.run({
          argv: dispatcherArguments,
          options,
        });
        process.exitCode = exitCode;
      })
      .parse([...argv]);
  }
}
