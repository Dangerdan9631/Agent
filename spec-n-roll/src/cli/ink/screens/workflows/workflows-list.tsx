import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import type {
  ContextContentState,
  SelectedOptionContext,
} from '../../components/ContextContent.js';
import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';
import { useSession } from '../../app/session-context.js';
import { homeRouteIdFor, type RouteId } from '../../app/navigation.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import {
  listWorkflowVariantSummaries,
  type WorkflowVariantSummary,
} from '../../read-models/workflow-variants.js';

/**
 * Selectable workflow row with its backing summary.
 */
interface WorkflowListItem extends SelectableListItem {
  /**
   * Read-only workflow summary represented by this row.
   */
  summary: WorkflowVariantSummary;
}

/**
 * Props for the workflows list screen.
 */
export type WorkflowsListScreenProps = RoutedScreenProps;

/**
 * Formats workflow steps with human-readable labels when available.
 *
 * @param summary - Workflow variant summary to describe.
 * @returns Ordered step detail for context content.
 */
function workflowStepDetail(summary: WorkflowVariantSummary): string {
  return `Steps: ${summary.stepSequence
    .map((stepId) => summary.stepLabels[stepId] ?? stepId)
    .join(' > ')}.`;
}

/**
 * Builds read-only focus context for a workflow row.
 *
 * @param summary - Workflow variant summary to describe.
 * @returns Selected option context derived from workflow configuration.
 */
function workflowContext(summary: WorkflowVariantSummary): SelectableListItem['context'] {
  return {
    id: `workflow:${summary.variantId}`,
    title: `Workflow ${summary.variantId}`,
    summary: summary.description ?? `${summary.displayName} workflow.`,
    status: summary.isDefault
      ? 'Default workflow for this project.'
      : 'Additional workflow.',
    details: [workflowStepDetail(summary), `Step count: ${summary.stepSequence.length}.`],
    nextStep: 'Open the workflow detail view.',
  };
}

/**
 * Builds selectable workflow rows from summaries.
 *
 * @param summaries - Workflow variant summaries to render.
 * @returns Selectable rows for the workflows list.
 */
function buildWorkflowItems(
  summaries: readonly WorkflowVariantSummary[],
): readonly WorkflowListItem[] {
  return summaries.map((summary) => ({
    id: summary.variantId,
    label: `${summary.displayName}${summary.isDefault ? ' (default)' : ''}`,
    description: summary.stepSequence.join(' > '),
    context: workflowContext(summary),
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
 * Renders configured workflow variants for read-only browsing.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the workflows list screen.
 */
export function WorkflowsListScreen(props: WorkflowsListScreenProps): React.ReactElement {
  const session = useSession();
  const [summaries, setSummaries] = useState<WorkflowVariantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const dataItems = useMemo(
    () => (summaries == null ? [] : buildWorkflowItems(summaries)),
    [summaries],
  );
  const items = useMemo((): readonly (WorkflowListItem | BackMenuItem)[] => {
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
  const contextState = useMemo(
    (): ContextContentState => ({
      routeTitle: 'Workflows',
      selectedContext,
    }),
    [selectedContext],
  );
  const reportFocusedContext = useCallback(
    (item: WorkflowListItem | BackMenuItem | undefined): void => {
      if (item == null || isBackMenuItem(item)) {
        setSelectedContext(undefined);
        return;
      }

      setSelectedContext(item.context);
    },
    [],
  );

  const handleSelect = useCallback(
    (item: WorkflowListItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      session.pushRoute('workflow-detail', item.summary.variantId);
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
    void listWorkflowVariantSummaries(session.projectRoot)
      .then((result) => {
        if (active) {
          setSummaries(result);
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
        <Text bold>Workflows</Text>
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
        <Text bold>Workflows</Text>
        <Text color="gray">Loading workflows...</Text>
      </Box>
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        <SelectableList
          items={items}
          onFocusChange={reportFocusedContext}
          onSelect={handleSelect}
        />
      }
    />
  );
}
