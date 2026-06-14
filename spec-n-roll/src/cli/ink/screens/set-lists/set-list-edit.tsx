import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { updateSetList } from '../../../../setlists/index.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import {
  editFieldsToSetListPatch,
  loadSetListDetailView,
  setListToEditFields,
  type SetListEditFields,
} from '../../read-models/set-lists.js';

/**
 * Editable field ids for the set list edit form.
 */
type SetListEditFieldId = keyof SetListEditFields;

/**
 * Ordered editable fields for keyboard navigation.
 */
const EDIT_FIELDS: readonly SetListEditFieldId[] = [
  'name',
  'description',
  'workflowId',
  'priority',
  'enabled',
];

/**
 * Returns the current route context label from the navigation stack.
 *
 * @param stack - Current navigation stack entries.
 * @returns Context label for the active route, or null when absent.
 */
function currentContextLabel(stack: readonly { contextLabel?: string }[]): string | null {
  return stack.at(-1)?.contextLabel ?? null;
}

/**
 * Cycles the workflow id field through configured workflow ids.
 *
 * @param current - Current workflow id value.
 * @param workflowIds - Available workflow ids from configuration.
 * @param direction - Step direction for cycling.
 * @returns Next workflow id in the cycle.
 */
function cycleWorkflowId(
  current: string,
  workflowIds: readonly string[],
  direction: 1 | -1,
): string {
  if (workflowIds.length === 0) {
    return current;
  }

  const index = workflowIds.indexOf(current);
  const nextIndex = index < 0 ? 0 : (index + direction + workflowIds.length) % workflowIds.length;
  return workflowIds[nextIndex] ?? current;
}

/**
 * Props for the set list edit screen.
 */
export type SetListEditScreenProps = RoutedScreenProps;

/**
 * Renders a keyboard-editable set list form that persists through shared validation.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the set list edit screen.
 */
export function SetListEditScreen(props: SetListEditScreenProps): React.ReactElement {
  const session = useSession();
  const setListId = currentContextLabel(session.navigationStack);
  const [workflowIds, setWorkflowIds] = useState<readonly string[]>([]);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [fields, setFields] = useState<SetListEditFields>({
    name: '',
    description: '',
    workflowId: '',
    priority: '1',
    enabled: true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotHeight = props.routeContentRows > 0 ? props.routeContentRows : undefined;

  useEffect(() => {
    if (setListId == null) {
      return;
    }

    let active = true;
    void loadSetListDetailView(session.projectRoot, setListId)
      .then((view) => {
        if (!active || view == null) {
          return;
        }

        setFields(setListToEditFields(view.setList));
        setWorkflowIds(view.workflowIds);
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        }
      });

    return () => {
      active = false;
    };
  }, [session.projectRoot, setListId]);

  useInput((input, key) => {
    if (setListId == null) {
      return;
    }

    const fieldId = EDIT_FIELDS[fieldIndex] ?? 'name';

    if (key.upArrow) {
      setFieldIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (key.downArrow || input === '\t') {
      setFieldIndex((current) => Math.min(EDIT_FIELDS.length - 1, current + 1));
      return;
    }

    if (fieldId === 'enabled' && (input === ' ' || input === 't')) {
      setFields((current) => ({ ...current, enabled: !current.enabled }));
      return;
    }

    if (fieldId === 'workflowId' && (input === '+' || key.rightArrow)) {
      setFields((current) => ({
        ...current,
        workflowId: cycleWorkflowId(current.workflowId, workflowIds, 1),
      }));
      return;
    }

    if (fieldId === 'workflowId' && (input === '-' || key.leftArrow)) {
      setFields((current) => ({
        ...current,
        workflowId: cycleWorkflowId(current.workflowId, workflowIds, -1),
      }));
      return;
    }

    if (key.backspace || key.delete) {
      if (fieldId === 'enabled' || fieldId === 'workflowId') {
        return;
      }

      setFields((current) => ({ ...current, [fieldId]: current[fieldId].slice(0, -1) }));
      return;
    }

    if (key.return) {
      setError(null);
      void (async () => {
        try {
          const patch = editFieldsToSetListPatch(fields);
          await updateSetList(session.projectRoot, setListId, patch);
          setMessage(`set list "${setListId}" updated`);
        } catch (unknownError: unknown) {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        }
      })();
      return;
    }

    if (fieldId === 'enabled' || fieldId === 'workflowId') {
      return;
    }

    if (/^[\w\s.,!?;:'"()\-/]+$/.test(input)) {
      setFields((current) => ({ ...current, [fieldId]: `${current[fieldId]}${input}` }));
    }
  });

  if (setListId == null) {
    return (
      <Box flexDirection="column" height={slotHeight}>
        <Text bold>Edit Set List</Text>
        <Text color="yellow">No set list is selected.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={slotHeight}>
      <Text bold>Edit Set List: {setListId}</Text>
      {EDIT_FIELDS.map((field, index) => (
        <Text key={field} color={index === fieldIndex ? 'cyan' : undefined}>
          {index === fieldIndex ? '>' : ' '}{' '}
          {field}:{' '}
          {field === 'enabled'
            ? fields.enabled
              ? 'true'
              : 'false'
            : fields[field] || '_'}
        </Text>
      ))}
      <Text color="gray">
        Up/Down move, Space toggles enabled, +/- cycles workflow, Enter save
      </Text>
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
