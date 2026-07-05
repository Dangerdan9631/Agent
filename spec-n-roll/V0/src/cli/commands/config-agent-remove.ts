import chalk from 'chalk';
import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { runConfigAgentRemove } from '../../sdk/config-agent.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { parseCommaSeparatedAgentList } from './core-cli-utils.js';

/**
 * Registers and handles the `config agent remove` CLI subcommand.
 */
@injectable()
export class ConfigAgentRemoveCommand implements CliCommand {
  private readonly logger: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('ConfigAgentRemoveCommand');
  }

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
              this.logger.info(`Agent not configured: ${chalk.yellow(agent.agentId)}`);
            } else {
              this.logger.info(`Removed agent: ${chalk.green(agent.agentId)}`);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`config agent remove failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
