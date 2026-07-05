import chalk from 'chalk';
import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { runConfigAgentAdd } from '../../sdk/config-agent.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { parseCommaSeparatedAgentList } from './core-cli-utils.js';

/**
 * Registers and handles the `config agent add` CLI subcommand.
 */
@injectable()
export class ConfigAgentAddCommand implements CliCommand {
  private readonly logger: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('ConfigAgentAddCommand');
  }

  register(command: Command): void {
    command
      .command('add <agents>')
      .description('Add agents to the project configuration')
      .action(async (agents: string) => {
        try {
          const result = await runConfigAgentAdd({
            projectRoot: process.cwd(),
            agents: parseCommaSeparatedAgentList(agents),
          });

          for (const agent of result.agents) {
            if (agent.alreadyConfigured) {
              this.logger.info(`Agent already configured: ${chalk.yellow(agent.agentId)}`);
            } else {
              this.logger.info(`Added agent: ${chalk.green(agent.agentId)}`);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`config agent add failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
