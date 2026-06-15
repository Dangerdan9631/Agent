import {
  getSetList,
  readSetListsFile,
  type SetList,
  type SetListsFile,
} from './setlists/index.js';

/**
 * JSON payload returned by set-list list and show commands.
 */
export interface SetListReadResult {
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
 * Loads set list data for read operations.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Scope selector for list versus show.
 * @returns JSON-serializable read payload.
 */
export async function loadSetListReadResult(
  projectRoot: string,
  options: { id?: string; includeDisabled?: boolean },
): Promise<SetListReadResult> {
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
