import { readSetListsFile, validateSetListsFile, type SetList } from '../../sdk/setlists/index.js';
import { readWorkflowConfig } from '../../sdk/workflow/artifacts.js';

/**
 * Validation summary attached to set list read-model views.
 */
export interface SetListValidationView {
  /**
   * Whether the current set lists file passes validation.
   */
  valid: boolean;
  /**
   * Human-readable validation failures when `valid` is false.
   */
  errors: readonly string[];
}

/**
 * Read-only summary of one configured set list for Ink screens.
 */
export interface SetListSummary {
  /**
   * Stable kebab-case set list id.
   */
  id: string;
  /**
   * Human-readable set list name.
   */
  name: string;
  /**
   * Triage description returned to agents during selection.
   */
  description: string;
  /**
   * Referenced workflow id from workflow configuration.
   */
  workflowId: string;
  /**
   * Priority used for tie-break selection during triage.
   */
  priority: number;
  /**
   * Whether the entry participates in triage evaluation.
   */
  enabled: boolean;
}

/**
 * Aggregated set lists list view for the Ink list screen.
 */
export interface SetListsListView {
  /**
   * Set list summaries in configuration order.
   */
  setLists: readonly SetListSummary[];
  /**
   * Validation outcome for the full configuration file.
   */
  validation: SetListValidationView;
}

/**
 * Detail view for one set list including validation status.
 */
export interface SetListDetailView {
  /**
   * Full set list entry fields.
   */
  setList: SetListSummary;
  /**
   * Validation outcome for the full configuration file.
   */
  validation: SetListValidationView;
  /**
   * Workflow ids available for selection in the edit screen.
   */
  workflowIds: readonly string[];
}

/**
 * Editable set list fields used by the Ink edit screen.
 */
export interface SetListEditFields {
  /**
   * Human-readable set list name.
   */
  name: string;
  /**
   * Triage description for agents.
   */
  description: string;
  /**
   * Referenced workflow id.
   */
  workflowId: string;
  /**
   * Priority for tie-break selection.
   */
  priority: string;
  /**
   * Whether the entry is enabled for triage.
   */
  enabled: boolean;
}

/**
 * Maps a persisted set list entry to a read-model summary.
 *
 * @param setList - Set list entry from configuration.
 * @returns Summary for Ink display.
 */
export function toSetListSummary(setList: SetList): SetListSummary {
  return {
    id: setList.id,
    name: setList.name,
    description: setList.description,
    workflowId: setList.workflowId,
    priority: setList.priority,
    enabled: setList.enabled,
  };
}

/**
 * Loads all set lists and validation status for the Ink list screen.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Set lists list view or null when configuration is missing.
 */
export async function loadSetListsListView(projectRoot: string): Promise<SetListsListView | null> {
  const file = await readSetListsFile(projectRoot);
  if (file == null) {
    return null;
  }

  const validation = await validateSetListsFile(projectRoot, file);
  return {
    setLists: file.setLists.map(toSetListSummary),
    validation,
  };
}

/**
 * Loads one set list detail view for the Ink detail screen.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param id - Set list id to load.
 * @returns Detail view or null when the entry or file is missing.
 */
export async function loadSetListDetailView(
  projectRoot: string,
  id: string,
): Promise<SetListDetailView | null> {
  const file = await readSetListsFile(projectRoot);
  if (file == null) {
    return null;
  }

  const setList = file.setLists.find((entry) => entry.id === id);
  if (setList == null) {
    return null;
  }

  const workflowConfig = await readWorkflowConfig(projectRoot);
  const workflowIds = workflowConfig?.workflows.map((workflow) => workflow.id) ?? [];
  const validation = await validateSetListsFile(projectRoot, file);

  return {
    setList: toSetListSummary(setList),
    validation,
    workflowIds,
  };
}

/**
 * Builds editable field text from a set list summary.
 *
 * @param setList - Set list summary to edit.
 * @returns Field text keyed by editable property.
 */
export function setListToEditFields(setList: SetListSummary): SetListEditFields {
  return {
    name: setList.name,
    description: setList.description,
    workflowId: setList.workflowId,
    priority: String(setList.priority),
    enabled: setList.enabled,
  };
}

/**
 * Converts editable field text into a partial set list update payload.
 *
 * @param fields - Current editable field text.
 * @returns Partial update accepted by the core set list writer.
 */
export function editFieldsToSetListPatch(
  fields: SetListEditFields,
): Pick<SetList, 'name' | 'description' | 'workflowId' | 'priority' | 'enabled'> {
  const priority = Number.parseInt(fields.priority, 10);
  if (!Number.isInteger(priority) || priority < 1) {
    throw new Error('Priority must be a positive integer.');
  }

  return {
    name: fields.name.trim(),
    description: fields.description.trim(),
    workflowId: fields.workflowId.trim(),
    priority,
    enabled: fields.enabled,
  };
}
