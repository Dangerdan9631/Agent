import chalk from 'chalk';
import { Logger } from 'tslog';
import type { CommandRunner } from '#test-support/command-runner.js';

/**
 * Emits the test support executable output.
 */
export class TestSupportCommandRunner implements CommandRunner {
  /**
   * Creates a command runner for the test support executable.
   *
   * @param logger - Logger used to emit the command's diagnostic and output messages.
   */
  constructor(private readonly logger: Logger<unknown>) {}

  /**
   * Executes the command action and logs the stub output.
   */
  run(): void {
    this.logger.debug('Running test support stub.');
    this.logger.info(chalk.green('spec-n-roll-test'));
  }
}
