import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteJson } from '../core/atomic-write.js';
import { migrateSetListsIfMissing } from '../updates/migration.js';
import { readWorkflowConfig } from '../workflow/artifacts.js';
import {
  parseSetListsFile,
  setListSchema,
  SET_LISTS_SCHEMA_VERSION,
  type SetList,
  type SetListsFile,
} from './schema.js';
import { evaluateSetListTriage, type SetListTriageResult } from './triage.js';

/**
 * Project-relative path to the set lists configuration file.
 */
export const SET_LISTS_RELATIVE_PATH = '.spec-n-roll/config/set-lists.json';

export type { SetList, SetListsFile } from './schema.js';
export {
  parseSetListsFile,
  setListSchema,
  setListsFileSchema,
  SET_LISTS_SCHEMA_VERSION,
} from './schema.js';
export {
  evaluateSetListTriage,
  selectSetListByPriority,
  type SetListTriageInput,
  type SetListTriageResult,
} from './triage.js';

/**
 * Result of validating a set lists file against workflow references and enabled rules.
 */
export interface SetListsValidationResult {
  /**
   * Whether the set lists file passes all validation rules.
   */
  valid: boolean;
  /**
   * Human-readable validation failures when `valid` is false.
   */
  errors: string[];
}

/**
 * Fields accepted when creating a new set list entry.
 */
export type SetListCreateInput = SetList;

/**
 * Patch fields accepted when updating an existing set list entry.
 */
export type SetListUpdateInput = Partial<Omit<SetList, 'id'>>;

/**
 * Builds the default set lists file seeded during project initialization.
 *
 * @returns Set lists document with papercut, quick, and full as ordinary data entries.
 */
export function createDefaultSetListsFile(): SetListsFile {
  return {
    schemaVersion: SET_LISTS_SCHEMA_VERSION,
    setLists: [
      {
        id: 'papercut',
        name: 'Papercut',
        description: 'Single-file or trivial changes with minimal ceremony',
        workflowId: 'papercut',
        priority: 1,
        enabled: true,
      },
      {
        id: 'quick',
        name: 'Quick',
        description: 'Small features with specify, tasks, and implement',
        workflowId: 'quick',
        priority: 2,
        enabled: true,
      },
      {
        id: 'full',
        name: 'Full',
        description: 'Full spec-kit flow with plan, tasks, and implement',
        workflowId: 'full',
        priority: 3,
        enabled: true,
      },
    ],
  };
}

/**
 * Reads the set lists configuration file from a project, migrating legacy projects when needed.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Parsed set lists file or null when the file is absent and migration cannot run.
 */
export async function readSetListsFile(projectRoot: string): Promise<SetListsFile | null> {
  const filePath = path.join(projectRoot, SET_LISTS_RELATIVE_PATH);
  if (!(await fse.pathExists(filePath))) {
    const migrated = await migrateSetListsIfMissing(projectRoot);
    if (migrated == null) {
      return null;
    }

    return migrated.file;
  }

  const raw: unknown = await fse.readJson(filePath);
  return parseSetListsFile(raw);
}

/**
 * Writes the set lists configuration file atomically.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param file - Set lists document to persist.
 */
export async function writeSetListsFile(projectRoot: string, file: SetListsFile): Promise<void> {
  const validated = parseSetListsFile(file);
  const filePath = path.join(projectRoot, SET_LISTS_RELATIVE_PATH);
  await atomicWriteJson(filePath, validated);
}

/**
 * Validates set list entries against workflow references and enabled-count rules.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param file - Optional in-memory file; when omitted, reads from disk.
 * @returns Validation outcome with any blocking error messages.
 */
export async function validateSetListsFile(
  projectRoot: string,
  file?: SetListsFile,
): Promise<SetListsValidationResult> {
  const resolved = file ?? (await readSetListsFile(projectRoot));
  if (resolved == null) {
    return {
      valid: false,
      errors: ['Set lists configuration file is missing.'],
    };
  }

  const errors: string[] = [];
  const workflowConfig = await readWorkflowConfig(projectRoot);
  const workflowIds = new Set(workflowConfig?.workflows.map((workflow) => workflow.id) ?? []);

  for (const setList of resolved.setLists) {
    if (!workflowIds.has(setList.workflowId)) {
      errors.push(
        `Set list "${setList.id}" references unknown workflow id "${setList.workflowId}".`,
      );
    }
  }

  const enabledCount = resolved.setLists.filter((setList) => setList.enabled).length;
  if (enabledCount === 0) {
    errors.push('At least one enabled set list is required for triage.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns one set list entry by id.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param id - Kebab-case set list id to load.
 * @returns Matching set list entry or null when not found.
 */
export async function getSetList(projectRoot: string, id: string): Promise<SetList | null> {
  const file = await readSetListsFile(projectRoot);
  if (file == null) {
    return null;
  }

  return file.setLists.find((setList) => setList.id === id) ?? null;
}

/**
 * Returns all set lists, optionally including disabled entries.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param includeDisabled - When false, only enabled entries are returned.
 * @returns Set list entries from the project configuration.
 */
export async function listSetLists(
  projectRoot: string,
  includeDisabled = true,
): Promise<SetList[]> {
  const file = await readSetListsFile(projectRoot);
  if (file == null) {
    return [];
  }

  return includeDisabled
    ? [...file.setLists]
    : file.setLists.filter((setList) => setList.enabled);
}

/**
 * Adds a new set list entry to the project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param input - Complete set list entry to create.
 * @returns Updated set lists file after persistence.
 */
export async function createSetList(
  projectRoot: string,
  input: SetListCreateInput,
): Promise<SetListsFile> {
  const entry = setListSchema.parse(input);
  const existing = await readSetListsFile(projectRoot);
  if (existing == null) {
    throw new Error('Set lists configuration file is missing.');
  }

  if (existing.setLists.some((setList) => setList.id === entry.id)) {
    throw new Error(`Set list "${entry.id}" already exists.`);
  }

  const nextFile = parseSetListsFile({
    schemaVersion: existing.schemaVersion,
    setLists: [...existing.setLists, entry],
  });
  const validation = await validateSetListsFile(projectRoot, nextFile);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  await writeSetListsFile(projectRoot, nextFile);
  return nextFile;
}

/**
 * Updates fields on an existing set list entry.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param id - Kebab-case id of the set list to update.
 * @param patch - Partial fields to merge into the existing entry.
 * @returns Updated set lists file after persistence.
 */
export async function updateSetList(
  projectRoot: string,
  id: string,
  patch: SetListUpdateInput,
): Promise<SetListsFile> {
  const existing = await readSetListsFile(projectRoot);
  if (existing == null) {
    throw new Error('Set lists configuration file is missing.');
  }

  const index = existing.setLists.findIndex((setList) => setList.id === id);
  if (index < 0) {
    throw new Error(`Set list "${id}" was not found.`);
  }

  const updatedEntry = setListSchema.parse({
    ...existing.setLists[index],
    ...patch,
    id,
  });
  const nextSetLists = [...existing.setLists];
  nextSetLists[index] = updatedEntry;

  const nextFile = parseSetListsFile({
    schemaVersion: existing.schemaVersion,
    setLists: nextSetLists,
  });
  const validation = await validateSetListsFile(projectRoot, nextFile);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  await writeSetListsFile(projectRoot, nextFile);
  return nextFile;
}

/**
 * Enables a set list entry for triage evaluation.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param id - Kebab-case id of the set list to enable.
 * @returns Updated set lists file after persistence.
 */
export async function enableSetList(projectRoot: string, id: string): Promise<SetListsFile> {
  return updateSetList(projectRoot, id, { enabled: true });
}

/**
 * Disables a set list entry so it is excluded from triage evaluation.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param id - Kebab-case id of the set list to disable.
 * @returns Updated set lists file after persistence.
 */
export async function disableSetList(projectRoot: string, id: string): Promise<SetListsFile> {
  const existing = await readSetListsFile(projectRoot);
  if (existing == null) {
    throw new Error('Set lists configuration file is missing.');
  }

  const enabledCount = existing.setLists.filter((setList) => setList.enabled).length;
  const target = existing.setLists.find((setList) => setList.id === id);
  if (target?.enabled === true && enabledCount <= 1) {
    throw new Error('Cannot disable the last enabled set list.');
  }

  return updateSetList(projectRoot, id, { enabled: false });
}

/**
 * Removes a set list entry from the project configuration.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param id - Kebab-case id of the set list to remove.
 * @returns Updated set lists file after persistence.
 */
export async function removeSetList(projectRoot: string, id: string): Promise<SetListsFile> {
  const existing = await readSetListsFile(projectRoot);
  if (existing == null) {
    throw new Error('Set lists configuration file is missing.');
  }

  const target = existing.setLists.find((setList) => setList.id === id);
  if (target == null) {
    throw new Error(`Set list "${id}" was not found.`);
  }

  const remainingEnabled = existing.setLists.filter(
    (setList) => setList.enabled && setList.id !== id,
  );
  if (target.enabled && remainingEnabled.length === 0) {
    throw new Error('Cannot remove the last enabled set list.');
  }

  const nextSetLists = existing.setLists.filter((setList) => setList.id !== id);
  if (nextSetLists.length === 0) {
    throw new Error('Cannot remove the last set list entry.');
  }

  const nextFile = parseSetListsFile({
    schemaVersion: existing.schemaVersion,
    setLists: nextSetLists,
  });
  await writeSetListsFile(projectRoot, nextFile);
  return nextFile;
}

/**
 * Loads enabled set lists from disk and evaluates triage for the given intent.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param userIntent - Natural-language description of the work to triage.
 * @returns Triage outcome including selected id or a blocking error state.
 */
export async function runSetListTriage(
  projectRoot: string,
  userIntent: string,
): Promise<SetListTriageResult> {
  const file = await readSetListsFile(projectRoot);

  if (file == null) {
    return {
      eligible: [],
      selectedId: null,
      selectionReason: 'missing-config',
      ambiguous: false,
      blocking: true,
      message: 'Set lists configuration file is missing.',
    };
  }

  return evaluateSetListTriage({
    userIntent,
    eligibleSetLists: file.setLists,
  });
}
