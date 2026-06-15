import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { formatBundledAgentsList, resolveListedAgents } from '../../sdk/list-agents.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `list agents` CLI subcommand.
 */
@injectable()
export class ListAgentsCommand implements CliCommand {
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
        console.log(formatBundledAgentsList(agents));
      });
  }
}
