import {
  loadSetListReadResult,
  type SetListReadCliResult,
} from '../cli/commands/set-list.js';
import { runSetListTriage } from '../setlists/index.js';
import type { SetListTriageResult } from '../setlists/triage.js';

/**
 * Input accepted by the `set_list_read` MCP tool.
 */
export interface SetListReadToolInput {
  /**
   * Optional set list id; when omitted, the full configuration file is returned.
   */
  id?: string;
}

/**
 * Input accepted by the `set_list_triage` MCP tool.
 */
export interface SetListTriageToolInput {
  /**
   * Natural-language description of the work to triage.
   */
  userIntent: string;
  /**
   * Optional task spec id for future contextual triage.
   */
  taskSpecId?: string;
  /**
   * Optional task spec slug for future contextual triage.
   */
  slug?: string;
}

/**
 * Executes the `set_list_read` tool payload against project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Optional set list id selector.
 * @returns JSON payload matching CLI list/show output.
 */
export async function executeSetListRead(
  projectRoot: string,
  input: SetListReadToolInput = {},
): Promise<SetListReadCliResult> {
  return loadSetListReadResult(projectRoot, { id: input.id });
}

/**
 * Executes the `set_list_triage` tool payload against project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - User intent and optional task spec context.
 * @returns Triage outcome including selected id or blocking state.
 */
export async function executeSetListTriage(
  projectRoot: string,
  input: SetListTriageToolInput,
): Promise<SetListTriageResult> {
  void input.taskSpecId;
  void input.slug;
  return runSetListTriage(projectRoot, input.userIntent);
}
