import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import type { ContextContentState, SelectedOptionContext } from '../../components/ContextContent.js';
import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';
import { useSession } from '../../app/session-context.js';
import { homeRouteIdFor, type RouteId } from '../../app/navigation.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import {
  listTaskSpecSummaries,
  type TaskSpecSummary,
  type TaskSpecSummaryList,
} from '../../read-models/task-specs.js';

/**
 * Selectable task spec row with its backing summary.
 */
interface TaskSpecListItem extends SelectableListItem {
  /**
   * Read-only task spec summary represented by this row.
   */
  summary?: TaskSpecSummary;
}

/**
 * Props for the task specs list screen.
 */
export type SpecsListScreenProps = RoutedScreenProps;

/**
 * Builds the display label for a recognized task spec summary.
 *
 * @param summary - Recognized task spec summary to render.
 * @returns Compact list label containing id and slug.
 */
function taskSpecLabel(summary: TaskSpecSummary): string {
  return `${summary.taskSpecId ?? '???'} ${summary.slug ?? summary.directoryName}`;
}

/**
 * Builds the display description for a recognized task spec summary.
 *
 * @param summary - Recognized task spec summary to render.
 * @returns Compact status and step description.
 */
function taskSpecDescription(summary: TaskSpecSummary): string {
  const step = summary.currentStepId ?? summary.lastCompletedStepId ?? 'no step';
  return `${summary.lifecycleStatus} | ${summary.operationalStatus} | ${step}`;
}

/**
 * Formats artifact presence as a compact ordered fact.
 *
 * @param summary - Recognized task spec summary to describe.
 * @returns Artifact presence detail for context content.
 */
function taskSpecArtifactDetail(summary: TaskSpecSummary): string {
  const present = Object.entries(summary.artifacts)
    .filter((entry) => entry[1])
    .map((entry) => entry[0])
    .join(', ');
  return `Artifacts: ${present || 'none found'}.`;
}

/**
 * Builds read-only focus context for a task spec row.
 *
 * @param summary - Recognized task spec summary to describe.
 * @returns Selected option context derived from the task spec read model.
 */
function taskSpecContext(summary: TaskSpecSummary): SelectableListItem['context'] {
  const step = summary.currentStepId ?? summary.lastCompletedStepId ?? 'none';
  const workflow = summary.workflowVariantId ?? 'unknown';

  return {
    id: `task-spec:${summary.directoryName}`,
    title: `${summary.taskSpecId ?? '???'} ${summary.slug ?? summary.directoryName}`,
    summary: `Lifecycle: ${summary.lifecycleStatus}; workflow: ${summary.operationalStatus}.`,
    status: `Step: ${step}; set list: ${workflow}.`,
    details: [taskSpecArtifactDetail(summary), `Directory: ${summary.directoryName}.`],
    warnings: summary.warnings,
    nextStep:
      summary.taskSpecId == null || summary.slug == null
        ? 'Select another recognized task spec.'
        : 'Open the task spec detail view.',
  };
}

/**
 * Maps task spec summaries to selectable list rows.
 *
 * @param summaries - Recognized task spec summaries.
 * @returns Selectable rows for the specs list.
 */
function buildTaskSpecItems(summaries: readonly TaskSpecSummary[]): readonly TaskSpecListItem[] {
  return summaries.map((summary) => ({
    id: summary.directoryName,
    label: taskSpecLabel(summary),
    description: taskSpecDescription(summary),
    context: taskSpecContext(summary),
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
 * Builds detail lines for unrecognized task spec directories.
 *
 * @param directories - Unrecognized task spec summaries.
 * @returns Ordered detail lines for route content display.
 */
function unrecognizedDetailLines(directories: readonly TaskSpecSummary[]): readonly string[] {
  if (directories.length === 0) {
    return [];
  }

  return [
    'Unrecognized',
    ...directories.map(
      (summary) => `! ${summary.directoryName} - ${summary.warnings.join(' ')}`,
    ),
  ];
}

/**
 * Renders recognized and unrecognized task spec directories.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the task specs browse screen.
 */
export function SpecsListScreen(props: SpecsListScreenProps): React.ReactElement {
  const session = useSession();
  const [summaries, setSummaries] = useState<TaskSpecSummaryList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const dataItems = useMemo(
    () => (summaries == null ? [] : buildTaskSpecItems(summaries.recognized)),
    [summaries],
  );
  const items = useMemo((): readonly (TaskSpecListItem | BackMenuItem)[] => {
    if (summaries == null) {
      return [];
    }

    return appendBackMenuItem(
      dataItems,
      parentRouteId(session.navigationStack, session.binaryContext),
    );
  }, [dataItems, session.binaryContext, session.navigationStack, summaries]);
  const backItem = useMemo(
    () => items.find((item): item is BackMenuItem => isBackMenuItem(item)),
    [items],
  );
  const contextState = useMemo((): ContextContentState => {
    if (selectedContext == null || summaries == null) {
      return {
        routeTitle: 'Task Specs',
        selectedContext,
      };
    }

    const unrecognizedDetails = unrecognizedDetailLines(summaries.unrecognized);
    if (unrecognizedDetails.length === 0) {
      return {
        routeTitle: 'Task Specs',
        selectedContext,
      };
    }

    return {
      routeTitle: 'Task Specs',
      selectedContext: {
        ...selectedContext,
        details: [...(selectedContext.details ?? []), ...unrecognizedDetails],
      },
    };
  }, [selectedContext, summaries]);
  const reportFocusedContext = useCallback((item: TaskSpecListItem | BackMenuItem | undefined): void => {
    if (item == null || isBackMenuItem(item)) {
      setSelectedContext(undefined);
      return;
    }

    setSelectedContext(item.context);
  }, []);

  useEffect(() => {
    let active = true;
    void listTaskSpecSummaries(session.projectRoot)
      .then((result) => {
        if (active) {
          setSummaries(result);
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const message = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(message);
        }
      });

    return () => {
      active = false;
    };
  }, [session.projectRoot]);

  const openSummary = useCallback(
    (item: TaskSpecListItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      if (item.summary == null) {
        return;
      }

      if (item.summary.taskSpecId == null || item.summary.slug == null) {
        return;
      }

      session.setSelectedTaskSpec({
        taskSpecId: item.summary.taskSpecId,
        slug: item.summary.slug,
        label: item.summary.directoryName,
      });
      session.pushRoute('spec-detail', item.summary.directoryName);
    },
    [session],
  );

  useInput((input) => {
    if (backItem != null && input === backItem.key) {
      session.popRoute();
    }
  });

  if (error != null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Task Specs</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (summaries == null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Task Specs</Text>
        <Text color="gray">Loading task specs...</Text>
      </Box>
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        summaries.recognized.length === 0 ? (
          <SelectableList items={items} onSelect={openSummary} />
        ) : (
          <SelectableList
            items={items}
            onFocusChange={reportFocusedContext}
            onSelect={openSummary}
          />
        )
      }
    />
  );
}
