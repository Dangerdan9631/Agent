import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { updateSetList } from '../../sdk/setlists/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Parses a positive integer CLI option value.
 *
 * @param value - Raw option string from Commander.
 * @returns Parsed positive integer.
 */
function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid priority "${value}"; expected a positive integer.`);
  }

  return parsed;
}

/**
 * Registers and handles the `set-list update` CLI subcommand.
 */
@injectable()
export class SetListUpdateCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('update')
      .description('Update fields on an existing set list entry')
      .argument('<id>', 'Set list id to update')
      .option('--name <name>', 'Human-readable set list name')
      .option('--description <description>', 'Triage description for agents')
      .option('--workflow-id <workflowId>', 'Referenced workflow id')
      .option('--priority <priority>', 'Priority for tie-break selection', parsePositiveInt)
      .action(
        async (
          id: string,
          options: {
            name?: string;
            description?: string;
            workflowId?: string;
            priority?: number;
          },
        ) => {
          try {
            const setListsFile = await updateSetList(process.cwd(), id, {
              ...(options.name != null ? { name: options.name } : {}),
              ...(options.description != null ? { description: options.description } : {}),
              ...(options.workflowId != null ? { workflowId: options.workflowId } : {}),
              ...(options.priority != null ? { priority: options.priority } : {}),
            });
            console.log(JSON.stringify({ setListsFile }, null, 2));
          } catch (error) {
            exitOnCoreError(error);
          }
        },
      );
  }
}
