import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { runConfigAgentRemove } from '../../sdk/config-agent.js';
import type { CliCommand } from './cli-command.js';
import { parseCommaSeparatedAgentList } from './core-cli-utils.js';

/**
 * Registers and handles the `config agent remove` CLI subcommand.
 */
@injectable()
export class ConfigAgentRemoveCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('remove <agents>')
      .description('Remove agents from the project configuration')
      .action(async (agents: string) => {
        try {
          const result = await runConfigAgentRemove({
            projectRoot: process.cwd(),
            agents: parseCommaSeparatedAgentList(agents),
          });

          for (const agent of result.agents) {
            if (agent.notConfigured) {
              console.log(`Agent not configured: ${agent.agentId}`);
            } else {
              console.log(`Removed agent: ${agent.agentId}`);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`config agent remove failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
