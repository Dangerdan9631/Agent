import { Command } from 'commander';
import type { CommandRunner } from '#test-support/application/commands/command-runner.js';
import { TestSupportContainerFactory } from '#test-support/composition/test-support/test-support-container-factory.js';

/**
 * Builds the test support command line program.
 */
export class TestSupportProgramFactory {
  /**
   * Creates a program factory.
   *
   * @param containerFactory - Dependency container factory for command services.
   */
  constructor(
    private readonly containerFactory = new TestSupportContainerFactory(),
  ) {}

  /**
   * Creates the test support command line program.
   *
   * @returns A commander program configured for the test support executable.
   */
  create(): Command {
    return new Command()
      .name('spec-n-roll-test')
      .description('Runs spec-n-roll test support workflows.')
      .version('0.1.0')
      .action(() => {
        this.containerFactory
          .create()
          .resolve<CommandRunner>(this.containerFactory.commandRunnerToken)
          .run();
      });
  }
}
