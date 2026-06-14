import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { StaticContentBlock } from '../../components/StaticContentBlock.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import {
  loadSetListDetailView,
  type SetListDetailView,
} from '../../read-models/set-lists.js';

/**
 * Menu row for set list detail actions.
 */
interface SetListDetailMenuItem extends SelectableListItem {
  /**
   * Stable action identifier for selection handling.
   */
  actionId: 'edit' | 'back';
}

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
 * Props for the set list detail screen.
 */
export type SetListDetailScreenProps = RoutedScreenProps;

/**
 * Renders one set list entry with validation status and navigation to edit.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the set list detail screen.
 */
export function SetListDetailScreen(props: SetListDetailScreenProps): React.ReactElement {
  const session = useSession();
  const setListId = currentContextLabel(session.navigationStack);
  const [view, setView] = useState<SetListDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuItems = useMemo(
    (): readonly SetListDetailMenuItem[] => [
      {
        id: 'edit',
        actionId: 'edit',
        label: 'Edit set list',
        description: 'Update name, description, priority, workflow, and enabled state',
        disabled: setListId == null,
      },
      {
        id: 'back',
        actionId: 'back',
        label: 'Back',
        description: 'Return to set lists list',
        disabled: false,
      },
    ],
    [setListId],
  );

  useEffect(() => {
    if (setListId == null) {
      return;
    }

    let active = true;
    void loadSetListDetailView(session.projectRoot, setListId)
      .then((loaded) => {
        if (active) {
          setView(loaded);
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const message =
            unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(message);
        }
      });

    return () => {
      active = false;
    };
  }, [session.projectRoot, setListId]);

  const handleSelect = useCallback(
    (item: SetListDetailMenuItem): void => {
      if (item.actionId === 'edit' && setListId != null) {
        session.pushRoute('set-list-edit', setListId);
        return;
      }

      session.popRoute();
    },
    [session, setListId],
  );

  useInput((input) => {
    if (input === 'e' && setListId != null) {
      session.pushRoute('set-list-edit', setListId);
    }

    if (input === 'b') {
      session.popRoute();
    }
  });

  if (setListId == null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Set List Detail</Text>
        <Text color="yellow">No set list is selected.</Text>
      </Box>
    );
  }

  if (error != null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Set List {setListId}</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (view == null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Set List {setListId}</Text>
        <Text color="gray">Loading set list...</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
    >
      <Text bold>{view.setList.name}</Text>
      <StaticContentBlock
        fields={[
          { label: 'Id', value: view.setList.id },
          { label: 'Enabled', value: view.setList.enabled ? 'yes' : 'no' },
          { label: 'Priority', value: String(view.setList.priority) },
          { label: 'Workflow', value: view.setList.workflowId },
          { label: 'Description', value: view.setList.description },
          {
            label: 'Validation',
            value: view.validation.valid ? 'ok' : view.validation.errors.join(' '),
          },
        ]}
      />
      <SelectableList items={menuItems} onSelect={handleSelect} />
      <Text color="gray">e edit, b back</Text>
    </Box>
  );
}
