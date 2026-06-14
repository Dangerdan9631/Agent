import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import type { ContextContentState, SelectedOptionContext } from '../../components/ContextContent.js';
import { useSession } from '../../app/session-context.js';
import { homeRouteIdFor, type RouteId } from '../../app/navigation.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import {
  loadSetListsListView,
  type SetListSummary,
  type SetListsListView,
} from '../../read-models/set-lists.js';

/**
 * Selectable set list row with its backing summary.
 */
interface SetListListItem extends SelectableListItem {
  /**
   * Read-only set list summary represented by this row.
   */
  summary: SetListSummary;
}

/**
 * Props for the set lists list screen.
 */
export type SetListsListScreenProps = RoutedScreenProps;

/**
 * Builds read-only focus context for a set list row.
 *
 * @param summary - Set list summary to describe.
 * @returns Selected option context derived from the set list read model.
 */
function setListContext(summary: SetListSummary): SelectableListItem['context'] {
  return {
    id: `set-list:${summary.id}`,
    title: summary.name,
    summary: summary.description,
    status: summary.enabled
      ? `Enabled; priority ${summary.priority}; workflow ${summary.workflowId}.`
      : `Disabled; priority ${summary.priority}; workflow ${summary.workflowId}.`,
    details: [`Set list id: ${summary.id}.`],
    nextStep: 'Open the set list detail view.',
  };
}

/**
 * Builds selectable set list rows from summaries.
 *
 * @param view - Loaded set lists list view.
 * @returns Selectable rows for the set lists list.
 */
function buildSetListItems(view: SetListsListView): readonly SetListListItem[] {
  return view.setLists.map((summary) => ({
    id: summary.id,
    label: `${summary.name}${summary.enabled ? '' : ' (disabled)'}`,
    description: `priority ${summary.priority} | ${summary.workflowId}`,
    context: setListContext(summary),
    summary,
  }));
}

/**
 * Resolves the parent route id used when building a Back row.
 *
 * @param navigationStack - Current navigation stack entries.
 * @param binaryContext - Active CLI invocation target.
 * @returns Parent route id for the Back row.
 */
function parentRouteId(
  navigationStack: readonly { routeId: RouteId }[],
  binaryContext: 'local' | 'global',
): RouteId {
  return navigationStack.at(-2)?.routeId ?? homeRouteIdFor(binaryContext);
}

/**
 * Renders configured set lists for browsing and navigation to detail/edit screens.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the set lists list screen.
 */
export function SetListsListScreen(props: SetListsListScreenProps): React.ReactElement {
  const session = useSession();
  const [view, setView] = useState<SetListsListView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const dataItems = useMemo(() => (view == null ? [] : buildSetListItems(view)), [view]);
  const items = useMemo((): readonly (SetListListItem | BackMenuItem)[] => {
    if (view == null) {
      return [];
    }

    return appendBackMenuItem(
      dataItems,
      parentRouteId(session.navigationStack, session.binaryContext),
    );
  }, [dataItems, session.binaryContext, session.navigationStack, view]);
  const backItem = useMemo(
    () => items.find((item): item is BackMenuItem => isBackMenuItem(item)),
    [items],
  );
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Set Lists',
      selectedContext,
    }),
    [selectedContext],
  );

  const reportFocusedContext = useCallback((item: SetListListItem | BackMenuItem | undefined): void => {
    if (item == null || isBackMenuItem(item)) {
      setSelectedContext(undefined);
      return;
    }

    setSelectedContext(item.context);
  }, []);

  const handleSelect = useCallback(
    (item: SetListListItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      session.pushRoute('set-list-detail', item.summary.id);
    },
    [session],
  );

  useInput((input) => {
    if (backItem != null && input === backItem.key) {
      session.popRoute();
    }
  });

  useEffect(() => {
    let active = true;
    void loadSetListsListView(session.projectRoot)
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
  }, [session.projectRoot]);

  if (error != null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Set Lists</Text>
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
        <Text bold>Set Lists</Text>
        <Text color="gray">Loading set lists...</Text>
      </Box>
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        <Box flexDirection="column">
          {!view.validation.valid ? (
            <Text color="yellow">Validation: {view.validation.errors.join(' ')}</Text>
          ) : (
            <Text color="green">Validation: ok</Text>
          )}
          <SelectableList
            items={items}
            onFocusChange={reportFocusedContext}
            onSelect={handleSelect}
          />
        </Box>
      }
    />
  );
}
