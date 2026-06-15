import chalk from 'chalk';
import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { runProjectRemove } from '../../sdk/remove.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `remove` top-level CLI command.
 */
@injectable()
export class RemoveCommand implements CliCommand {
  private readonly logger: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('RemoveCommand');
  }

  register(command: Command): void {
    command
      .command('remove')
      .description('Remove Spec-N-Roll managed files from the current project')
      .option('--yes', 'Skip confirmation prompt and proceed with removal')
      .option('--project-root <path>', 'Absolute project root override')
      .action(async (commandOptions: { yes?: boolean; projectRoot?: string }) => {
        try {
          const result = await runProjectRemove({
            cwd: process.cwd(),
            projectRoot: commandOptions.projectRoot,
            skipConfirmation: commandOptions.yes === true,
          });

          this.logger.info(
            `Removed Spec-N-Roll managed files from ${chalk.cyan(result.projectRoot)}.`,
          );
          for (const removedPath of result.removedPaths) {
            this.logger.info(chalk.dim(`- ${removedPath}`));
          }
          if (result.agentMcpCleaned.length > 0) {
            this.logger.info(
              `Cleaned agent MCP entries: ${chalk.green(result.agentMcpCleaned.join(', '))}`,
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`remove failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
