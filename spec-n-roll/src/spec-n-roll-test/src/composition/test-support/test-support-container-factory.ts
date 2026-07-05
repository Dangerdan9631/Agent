import { container, type DependencyContainer } from 'tsyringe';
import { Logger } from 'tslog';
import type { CommandRunner } from '#test-support/application/commands/command-runner.js';
import { TestSupportCommandRunner } from '#test-support/infrastructure/commands/test-support-command-runner.js';

/**
 * Creates dependency containers for test support command invocations.
 */
export class TestSupportContainerFactory {
  /**
   * Identifies the command runner registration in the executable container.
   */
  readonly commandRunnerToken = 'spec-n-roll-test.commandRunner';

  /**
   * Creates a dependency container factory.
   *
   * @param logger - Diagnostic logger shared by command services.
   */
  constructor(
    private readonly logger = new Logger({
      name: 'spec-n-roll-test',
      minLevel: 6,
    }),
  ) {}

  /**
   * Creates a dependency container for one test support command invocation.
   *
   * @returns A child dependency container with command execution services registered.
   */
  create(): DependencyContainer {
    const commandContainer = container.createChildContainer();
    commandContainer.registerInstance<CommandRunner>(
      this.commandRunnerToken,
      new TestSupportCommandRunner(this.logger),
    );

    return commandContainer;
  }
}
