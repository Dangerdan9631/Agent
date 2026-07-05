import { Command } from 'commander';
import type { CommandRunner } from '#mcp/application/commands/command-runner.js';
import { McpContainerFactory } from '#mcp/composition/mcp/mcp-container-factory.js';

/**
 * Builds the MCP command line program.
 */
export class McpProgramFactory {
  /**
   * Creates an MCP program factory.
   *
   * @param containerFactory - Dependency container factory for command services.
   */
  constructor(private readonly containerFactory = new McpContainerFactory()) {}

  /**
   * Creates the MCP command line program.
   *
   * @returns A commander program configured for the MCP executable.
   */
  create(): Command {
    return new Command()
      .name('spec-n-roll-mcp')
      .description('Runs the spec-n-roll MCP server process.')
      .version('0.1.0')
      .action(() => {
        this.containerFactory
          .create()
          .resolve<CommandRunner>(this.containerFactory.commandRunnerToken)
          .run();
      });
  }
}
