import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { formatBundledAgentsList, resolveListedAgents } from '../../sdk/list-agents.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `list agents` CLI subcommand.
 */
@injectable()
export class ListAgentsCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('ListAgentsCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('agents')
      .description('List all available agents')
      .option('--enabled', 'List only agents installed and enabled in this project')
      .action(async (commandOptions: { enabled?: boolean }) => {
        const agents = await resolveListedAgents({
          enabledOnly: commandOptions.enabled === true,
          projectRoot: process.cwd(),
        });
        this.output.info(formatBundledAgentsList(agents));
      });
  }
}
