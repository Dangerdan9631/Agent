import React, { useMemo, useState } from 'react';
import { Box, Text } from 'ink';

import {
  setTaskSpecStatus,
  type TaskSpecLifecycleStatus,
  type TaskSpecStatusTransition,
} from '../../../../core/task-lifecycle.js';
import type { TaskSpecIdentity } from '../../../../workflow/engine.js';
import { useSession } from '../../app/session-context.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { useSelectionRowContribution } from '../../components/SelectionRegion.js';

/**
 * Input accepted by the interactive task status mutation path.
 */
export interface InteractiveTaskStatusSetInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Task spec identity selected for mutation.
   */
  taskSpec: TaskSpecIdentity;
  /**
   * Target lifecycle status to persist in spec.md frontmatter.
   */
  status: TaskSpecLifecycleStatus;
}

/**
 * Selectable lifecycle status row for the status mutation screen.
 */
interface StatusItem extends SelectableListItem {
  /**
   * Lifecycle status value passed to the core writer.
   */
  status: TaskSpecLifecycleStatus;
}

/**
 * Lifecycle statuses supported by the core task status writer.
 */
const STATUS_ITEMS: readonly StatusItem[] = [
  { id: 'Active', label: 'Active', description: 'work may continue', status: 'Active' },
  { id: 'Complete', label: 'Complete', description: 'implementation is done', status: 'Complete' },
  { id: 'Locked', label: 'Locked', description: 'prevent further mutation', status: 'Locked' },
];

/**
 * Applies the interactive task status mutation by delegating to the core writer.
 *
 * @param input - Project, task spec, and target status.
 * @returns Previous and new lifecycle status values.
 */
export async function applyInteractiveTaskStatusSet(
  input: InteractiveTaskStatusSetInput,
): Promise<TaskSpecStatusTransition> {
  return setTaskSpecStatus(
    input.projectRoot,
    input.taskSpec.taskSpecId,
    input.taskSpec.slug,
    input.status,
  );
}

/**
 * Renders lifecycle status choices for the selected task spec.
 *
 * @returns React element for the task status mutation screen.
 */
export function TaskStatusSetScreen(): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const extraRows = useMemo(() => {
    let rows = 1;
    if (selected == null) {
      rows += 1;
    } else {
      rows += 1;
    }

    if (message != null) {
      rows += 1;
    }

    if (error != null) {
      rows += 1;
    }

    return rows;
  }, [error, message, selected]);
  useSelectionRowContribution(extraRows);

  const setStatus = (item: StatusItem): void => {
    if (selected == null) {
      return;
    }

    setError(null);
    void applyInteractiveTaskStatusSet({
      projectRoot: session.projectRoot,
      taskSpec: selected,
      status: item.status,
    })
      .then((result) => {
        setMessage(`status: ${result.previousStatus ?? 'unset'} -> ${result.status}`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      });
  };

  return (
    <Box flexDirection="column">
      <Text bold>Set Task Status</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <SelectableList items={STATUS_ITEMS} onSelect={setStatus} />
        </>
      )}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
