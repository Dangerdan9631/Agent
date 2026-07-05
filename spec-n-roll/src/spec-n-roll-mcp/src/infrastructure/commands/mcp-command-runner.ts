import chalk from 'chalk';
import { Logger } from 'tslog';
import type { CommandRunner } from '#mcp/application/commands/command-runner.js';

/**
 * Emits the MCP executable stub output.
 */
export class McpCommandRunner implements CommandRunner {
  /**
   * Creates an MCP command runner.
   *
   * @param logger - Logger used to emit the command's diagnostic and output messages.
   */
  constructor(private readonly logger: Logger<unknown>) {}

  /**
   * Executes the command action and logs the stub output.
   */
  run(): void {
    this.logger.debug('Running MCP stub.');
    this.logger.info(chalk.green('spec-n-roll-mcp'));
  }
}
