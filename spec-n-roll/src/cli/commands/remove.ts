import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { runProjectRemove } from '../../sdk/remove.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers and handles the `remove` top-level CLI command.
 */
@injectable()
export class RemoveCommand implements CliCommand {
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

          console.log(`Removed Spec-N-Roll managed files from ${result.projectRoot}.`);
          for (const removedPath of result.removedPaths) {
            console.log(`- ${removedPath}`);
          }
          if (result.agentMcpCleaned.length > 0) {
            console.log(`Cleaned agent MCP entries: ${result.agentMcpCleaned.join(', ')}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`remove failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
