import { Command } from 'commander';

import {
  createSetList,
  disableSetList,
  enableSetList,
  getSetList,
  readSetListsFile,
  removeSetList,
  runSetListTriage,
  updateSetList,
  validateSetListsFile,
  type SetList,
  type SetListsFile,
} from '../../setlists/index.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * JSON payload returned by set-list list and show commands.
 */
export interface SetListReadCliResult {
  /**
   * Full set lists file when listing all entries.
   */
  setListsFile?: SetListsFile;
  /**
   * One set list entry when showing a single id.
   */
  setList?: SetList;
}

/**
 * Loads set list data for CLI read subcommands.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Scope selector for list versus show.
 * @returns JSON-serializable read payload.
 */
export async function loadSetListReadResult(
  projectRoot: string,
  options: { id?: string; includeDisabled?: boolean },
): Promise<SetListReadCliResult> {
  if (options.id != null) {
    const setList = await getSetList(projectRoot, options.id);
    if (setList == null) {
      throw new Error(`Set list "${options.id}" was not found.`);
    }

    return { setList };
  }

  const setListsFile = await readSetListsFile(projectRoot);
  if (setListsFile == null) {
    throw new Error('Set lists configuration file is missing.');
  }

  if (options.includeDisabled === false) {
    return {
      setListsFile: {
        ...setListsFile,
        setLists: setListsFile.setLists.filter((entry) => entry.enabled),
      },
    };
  }

  return { setListsFile };
}

/**
 * Registers the `set-list list` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListListCommand(setList: Command): void {
  setList
    .command('list')
    .description('List configured set lists as JSON')
    .option('--include-disabled', 'Include disabled set lists', true)
    .option('--exclude-disabled', 'Omit disabled set lists from the response')
    .action(async (options: { excludeDisabled?: boolean }) => {
      try {
        const result = await loadSetListReadResult(process.cwd(), {
          includeDisabled: options.excludeDisabled !== true,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

/**
 * Registers the `set-list show` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListShowCommand(setList: Command): void {
  setList
    .command('show')
    .description('Show one set list entry as JSON')
    .argument('<id>', 'Set list id to load')
    .action(async (id: string) => {
      try {
        const result = await loadSetListReadResult(process.cwd(), { id });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

/**
 * Registers the `set-list create` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListCreateCommand(setList: Command): void {
  setList
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

/**
 * Registers the `set-list update` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListUpdateCommand(setList: Command): void {
  setList
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

/**
 * Registers the `set-list enable` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListEnableCommand(setList: Command): void {
  setList
    .command('enable')
    .description('Enable a set list for triage evaluation')
    .argument('<id>', 'Set list id to enable')
    .action(async (id: string) => {
      try {
        const setListsFile = await enableSetList(process.cwd(), id);
        console.log(JSON.stringify({ setListsFile }, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

/**
 * Registers the `set-list disable` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListDisableCommand(setList: Command): void {
  setList
    .command('disable')
    .description('Disable a set list so it is excluded from triage')
    .argument('<id>', 'Set list id to disable')
    .action(async (id: string) => {
      try {
        const setListsFile = await disableSetList(process.cwd(), id);
        console.log(JSON.stringify({ setListsFile }, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

/**
 * Registers the `set-list remove` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListRemoveCommand(setList: Command): void {
  setList
    .command('remove')
    .description('Remove a set list entry from the project configuration')
    .argument('<id>', 'Set list id to remove')
    .action(async (id: string) => {
      try {
        const setListsFile = await removeSetList(process.cwd(), id);
        console.log(JSON.stringify({ setListsFile }, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

/**
 * Registers the `set-list validate` subcommand.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListValidateCommand(setList: Command): void {
  setList
    .command('validate')
    .description('Validate set list references and enabled-count rules')
    .action(async () => {
      try {
        const result = await validateSetListsFile(process.cwd());
        console.log(JSON.stringify(result, null, 2));
        if (!result.valid) {
          process.exit(1);
        }
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

/**
 * Registers the optional `set-list triage` subcommand for MCP parity.
 *
 * @param setList - Commander `set-list` command group.
 */
function registerSetListTriageCommand(setList: Command): void {
  setList
    .command('triage')
    .description('Evaluate user intent against enabled set lists')
    .requiredOption('--intent <text>', 'Natural-language description of the work')
    .action(async (options: { intent: string }) => {
      try {
        const result = await runSetListTriage(process.cwd(), options.intent);
        console.log(JSON.stringify(result, null, 2));
        if (result.blocking) {
          process.exit(1);
        }
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}

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
 * Registers the `set-list` command group and all CRUD subcommands on the root program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerSetListCommand(program: Command): void {
  const setList = program
    .command('set-list')
    .description('Configure set lists that drive workflow triage');

  registerSetListListCommand(setList);
  registerSetListShowCommand(setList);
  registerSetListCreateCommand(setList);
  registerSetListUpdateCommand(setList);
  registerSetListEnableCommand(setList);
  registerSetListDisableCommand(setList);
  registerSetListRemoveCommand(setList);
  registerSetListValidateCommand(setList);
  registerSetListTriageCommand(setList);
}
