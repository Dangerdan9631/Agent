import fse from 'fs-extra';

import { assertTaskSpecWritable } from './task-lifecycle.js';
import { taskSpecFilePath } from './paths.js';
import { atomicWriteText } from './atomic-write.js';
import { CoreMutationError } from './errors.js';

/**
 * Result of toggling a task checkbox in `tasks.md`.
 */
export interface TaskCheckboxUpdate {
  /** Task id that was updated (e.g. `T042`). */
  taskId: string;
  /** Whether the checkbox is now marked complete. */
  completed: boolean;
}

const CHECKBOX_LINE_PATTERN = /^(- \[[ xX]\] )([A-Z][A-Z0-9]*)(.*)$/;

const TASK_ID_PATTERN = /^T[0-9]+$/;

/**
 * Normalizes task id input to a deduplicated list while preserving first-seen order.
 *
 * @param taskIds - One or more checkbox task identifiers.
 * @returns Deduplicated task id list.
 */
function normalizeTaskIds(taskIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const taskId of taskIds) {
    if (!TASK_ID_PATTERN.test(taskId)) {
      throw new CoreMutationError(
        'INVALID_TASK_ID',
        `Task id "${taskId}" is invalid; expected format such as T042.`,
        'Use uppercase T followed by digits matching tasks.md checkbox lines.',
      );
    }
    if (!seen.has(taskId)) {
      seen.add(taskId);
      normalized.push(taskId);
    }
  }

  if (normalized.length === 0) {
    throw new CoreMutationError(
      'TASK_IDS_REQUIRED',
      'At least one task id is required.',
      'Pass one or more --task-id values for the same task spec.',
    );
  }

  return normalized;
}

/**
 * Toggles one or more task completion checkboxes in `tasks.md` within the same task spec.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param taskIds - Checkbox task identifiers such as `T042`; all must exist in the same tasks.md.
 * @param completed - Desired completion state applied to every listed task id.
 * @returns Confirmation for each updated checkbox.
 */
export async function setTaskCheckboxes(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  taskIds: readonly string[],
  completed: boolean,
): Promise<TaskCheckboxUpdate[]> {
  const ids = normalizeTaskIds(taskIds);

  await assertTaskSpecWritable(projectRoot, taskSpecId, slug);

  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'tasks.md');
  if (!(await fse.pathExists(filePath))) {
    throw new CoreMutationError(
      'TASKS_MISSING',
      `tasks.md does not exist for task spec ${taskSpecId}-${slug}.`,
      'Instantiate the tasks step output before toggling checkboxes.',
    );
  }

  const content = await fse.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const foundIds = new Set<string>();
  const idSet = new Set(ids);

  const updatedLines = lines.map((line) => {
    const match = CHECKBOX_LINE_PATTERN.exec(line);
    if (match == null || !idSet.has(match[2])) {
      return line;
    }

    foundIds.add(match[2]);
    const marker = completed ? 'x' : ' ';
    return `- [${marker}] ${match[2]}${match[3] ?? ''}`;
  });

  const missingIds = ids.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new CoreMutationError(
      'TASK_ID_NOT_FOUND',
      `Task id(s) not found in tasks.md for ${taskSpecId}-${slug}: ${missingIds.join(', ')}.`,
      'Verify each task id matches a checkbox line in the same task spec tasks.md.',
    );
  }

  await atomicWriteText(filePath, updatedLines.join('\n'));
  return ids.map((taskId) => ({ taskId, completed }));
}

/**
 * Toggles a single task completion checkbox in `tasks.md`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param taskId - Checkbox task identifier such as `T042`.
 * @param completed - Desired completion state.
 * @returns Confirmation of the updated checkbox state.
 */
export async function setTaskCheckbox(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  taskId: string,
  completed: boolean,
): Promise<TaskCheckboxUpdate> {
  const [result] = await setTaskCheckboxes(projectRoot, taskSpecId, slug, [taskId], completed);
  return result;
}
