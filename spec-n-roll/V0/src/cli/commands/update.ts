import chalk from 'chalk';
import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { runUpdate } from '../../sdk/update.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `update` top-level CLI command.
 */
@injectable()
export class UpdateCommand implements CliCommand {
  private readonly logger: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('UpdateCommand');
  }

  register(command: Command): void {
    command
      .command('update')
      .option('--dry-run', 'Preview update changes without applying them')
      .option('--force', 'Apply breaking config migrations without confirmation')
      .description('Update the toolkit to the latest version')
      .action(async (commandOptions: { dryRun?: boolean; force?: boolean }) => {
        try {
          const result = await runUpdate({
            projectRoot: process.cwd(),
            dryRun: commandOptions.dryRun === true,
            force: commandOptions.force === true,
          });

          const versionTransition = `${chalk.yellow(result.previousToolkitVersion)} ${chalk.dim('->')} ${chalk.green(result.targetToolkitVersion)}`;

          if (result.dryRun) {
            this.logger.info(`Dry run: would update toolkit ${versionTransition}`);
            this.logger.info(`Files: ${chalk.cyan(String(result.overwrittenFiles.length))}`);
            this.logger.info(`Backups: ${chalk.cyan(String(result.backupConflicts.length))}`);
            this.logger.info(
              `Config migrations: ${chalk.cyan(String(result.configMigrations.length))}`,
            );
            for (const warning of result.extensionWarnings) {
              this.logger.warn(warning);
            }
            return;
          }

          this.logger.info(`Updated Spec-N-Roll ${versionTransition}`);
          this.logger.info(
            `Overwrote ${chalk.cyan(String(result.overwrittenFiles.length))} toolkit-owned file(s).`,
          );
          if (result.configMigrations.length > 0) {
            this.logger.info(
              `Migrated ${chalk.cyan(String(result.configMigrations.length))} user-owned config file(s).`,
            );
          }
          if (result.backupConflicts.length > 0) {
            this.logger.info(
              `Backed up ${chalk.cyan(String(result.backupConflicts.length))} locally modified toolkit-owned file(s) to .bak.`,
            );
          }
          for (const warning of result.extensionWarnings) {
            this.logger.warn(warning);
          }
          const refreshed = result.mcpRefresh.filter((entry) => entry.refreshed).length;
          this.logger.info(
            `Refreshed MCP config for ${chalk.cyan(String(refreshed))} agent target(s).`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`update failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
