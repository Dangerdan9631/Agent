import { container, type DependencyContainer } from 'tsyringe';
import { Logger } from 'tslog';
import type { CommandRunner } from '#mcp/application/commands/command-runner.js';
import { McpCommandRunner } from '#mcp/infrastructure/commands/mcp-command-runner.js';

/**
 * Creates dependency containers for MCP command invocations.
 */
export class McpContainerFactory {
  /**
   * Identifies the command runner registration in the executable container.
   */
  readonly commandRunnerToken = 'spec-n-roll-mcp.commandRunner';

  /**
   * Creates a dependency container factory.
   *
   * @param logger - Diagnostic logger shared by command services.
   */
  constructor(
    private readonly logger = new Logger({
      name: 'spec-n-roll-mcp',
      minLevel: 6,
    }),
  ) {}

  /**
   * Creates a dependency container for one MCP command invocation.
   *
   * @returns A child dependency container with command execution services registered.
   */
  create(): DependencyContainer {
    const commandContainer = container.createChildContainer();
    commandContainer.registerInstance<CommandRunner>(
      this.commandRunnerToken,
      new McpCommandRunner(this.logger),
    );

    return commandContainer;
  }
}
