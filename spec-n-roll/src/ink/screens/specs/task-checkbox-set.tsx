import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

import {
  setTaskCheckboxes,
  type TaskCheckboxUpdate,
} from '../../../sdk/core/task-checkboxes.js';
import type { TaskSpecIdentity } from '../../../sdk/workflow/engine.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';

/**
 * Input accepted by the interactive task checkbox mutation path.
 */
export interface InteractiveTaskCheckboxSetInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Task spec identity selected for mutation.
   */
  taskSpec: TaskSpecIdentity;
  /**
   * One or more task ids such as T001; ids are validated by the core writer.
   */
  taskIds: readonly string[];
  /**
   * Desired completion marker applied to every listed task id.
   */
  completed: boolean;
}

/**
 * Applies the interactive task checkbox mutation by delegating to the core writer.
 *
 * @param input - Project, task spec, target task ids, and completion state.
 * @returns Per-task checkbox update confirmations.
 */
export async function applyInteractiveTaskCheckboxSet(
  input: InteractiveTaskCheckboxSetInput,
): Promise<TaskCheckboxUpdate[]> {
  return setTaskCheckboxes(
    input.projectRoot,
    input.taskSpec.taskSpecId,
    input.taskSpec.slug,
    input.taskIds,
    input.completed,
  );
}

/**
 * Parses task ids from a comma or whitespace separated input line.
 *
 * @param value - Raw task id entry field.
 * @returns Parsed task id values in entry order.
 */
function parseTaskIds(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Renders a compact task checkbox edit form for the selected task spec.
 *
 * @returns React element for the task checkbox mutation screen.
 */
export function TaskCheckboxSetScreen(_props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const [taskIds, setTaskIds] = useState('');
  const [completed, setCompleted] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (selected == null) {
      return;
    }

    if (key.backspace || key.delete) {
      setTaskIds((current) => current.slice(0, -1));
      return;
    }

    if (input === 'c') {
      setCompleted((current) => !current);
      return;
    }

    if (key.return) {
      setError(null);
      void applyInteractiveTaskCheckboxSet({
        projectRoot: session.projectRoot,
        taskSpec: selected,
        taskIds: parseTaskIds(taskIds),
        completed,
      })
        .then((updates) => {
          setMessage(
            updates
              .map((update) => `${update.taskId}:${update.completed ? 'complete' : 'open'}`)
              .join(', '),
          );
        })
        .catch((unknownError: unknown) => {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        });
      return;
    }

    if (/^[A-Za-z0-9,\s-]$/.test(input)) {
      setTaskIds((current) => `${current}${input}`);
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Set Task Checkbox</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <Text>task ids: {taskIds.length > 0 ? taskIds : '_'}</Text>
          <Text>completed: {String(completed)} (c toggle, Enter apply)</Text>
        </>
      )}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
