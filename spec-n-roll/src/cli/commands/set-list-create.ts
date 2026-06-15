import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { createSetList } from '../../sdk/setlists/index.js';
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
 * Registers and handles the `set-list create` CLI subcommand.
 */
@injectable()
export class SetListCreateCommand implements CliCommand {
  register(command: Command): void {
    command
      .command('create')
      .description('Create a new set list entry')
      .requiredOption('--id <id>', 'Kebab-case set list id')
      .requiredOption('--name <name>', 'Human-readable set list name')
      .requiredOption('--description <description>', 'Triage description for agents')
      .requiredOption('--workflow-id <workflowId>', 'Referenced workflow id')
      .requiredOption('--priority <priority>', 'Priority for tie-break selection', parsePositiveInt)
      .option('--enabled', 'Create the entry as enabled', true)
      .option('--disabled', 'Create the entry as disabled')
      .action(
        async (options: {
          id: string;
          name: string;
          description: string;
          workflowId: string;
          priority: number;
          disabled?: boolean;
        }) => {
          try {
            const setListsFile = await createSetList(process.cwd(), {
              id: options.id,
              name: options.name,
              description: options.description,
              workflowId: options.workflowId,
              priority: options.priority,
              enabled: options.disabled !== true,
            });
            console.log(JSON.stringify({ setListsFile }, null, 2));
          } catch (error) {
            exitOnCoreError(error);
          }
        },
      );
  }
}
