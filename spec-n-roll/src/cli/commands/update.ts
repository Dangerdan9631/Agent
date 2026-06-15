import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { runUpdate } from '../../sdk/update.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `update` top-level CLI command.
 */
@injectable()
export class UpdateCommand implements CliCommand {
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

          if (result.dryRun) {
            console.log(
              `Dry run: would update toolkit ${result.previousToolkitVersion} -> ${result.targetToolkitVersion}`,
            );
            console.log(`Files: ${result.overwrittenFiles.length}`);
            console.log(`Backups: ${result.backupConflicts.length}`);
            console.log(`Config migrations: ${result.configMigrations.length}`);
            for (const warning of result.extensionWarnings) {
              console.log(`Warning: ${warning}`);
            }
            return;
          }

          console.log(
            `Updated Spec-N-Roll ${result.previousToolkitVersion} -> ${result.targetToolkitVersion}`,
          );
          console.log(`Overwrote ${result.overwrittenFiles.length} toolkit-owned file(s).`);
          if (result.configMigrations.length > 0) {
            console.log(`Migrated ${result.configMigrations.length} user-owned config file(s).`);
          }
          if (result.backupConflicts.length > 0) {
            console.log(
              `Backed up ${result.backupConflicts.length} locally modified toolkit-owned file(s) to .bak.`,
            );
          }
          for (const warning of result.extensionWarnings) {
            console.log(`Warning: ${warning}`);
          }
          const refreshed = result.mcpRefresh.filter((entry) => entry.refreshed).length;
          console.log(`Refreshed MCP config for ${refreshed} agent target(s).`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`update failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
