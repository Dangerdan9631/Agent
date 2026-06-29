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
import type { RepositoryWorkflowReportSummary } from '../../../sdk/interactive/repository-workflows.js';
import { listTaskSpecSummaries } from '../../read-models/task-specs.js';

/**
 * Selectable repository workflow report row with its backing summary.
 */
interface RepositoryWorkflowReportListItem extends SelectableListItem {
  /**
   * Read-only report summary represented by this row.
   */
  summary: RepositoryWorkflowReportSummary;
}

/**
 * Props for the repository workflow reports list screen.
 */
export type RepositoryWorkflowReportsListScreenProps = RoutedScreenProps;

/**
 * Builds read-only focus context for a repository workflow report row.
 *
 * @param summary - Repository workflow report summary to describe.
 * @returns Selected option context derived from report metadata.
 */
function reportContext(summary: RepositoryWorkflowReportSummary): SelectableListItem['context'] {
  return {
    id: `repository-workflow-report:${summary.directoryName}`,
    title: summary.directoryName,
    summary: summary.workflowTypeName ?? 'Repository workflow report',
    status: summary.specifyOutputRef ?? 'No linked specify output',
    details: [
      `Report: ${summary.reportPath}`,
      `Sections: ${summary.sectionHeadings.join(', ') || 'none'}`,
    ],
    nextStep: 'Open the report detail view.',
  };
}

/**
 * Builds selectable report rows from summaries.
 *
 * @param summaries - Repository workflow report summaries to render.
 * @returns Selectable rows for the reports list.
 */
function buildReportItems(
  summaries: readonly RepositoryWorkflowReportSummary[],
): readonly RepositoryWorkflowReportListItem[] {
  return summaries.map((summary) => ({
    id: summary.directoryName,
    label: summary.directoryName,
    description: summary.workflowTypeName ?? 'Repository workflow report',
    context: reportContext(summary),
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
 * Renders repository workflow report artifacts for read-only browsing.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the repository workflow reports list screen.
 */
export function RepositoryWorkflowReportsListScreen(
  props: RepositoryWorkflowReportsListScreenProps,
): React.ReactElement {
  const session = useSession();
  const [summaries, setSummaries] = useState<RepositoryWorkflowReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const dataItems = useMemo(
    () => (summaries == null ? [] : buildReportItems(summaries)),
    [summaries],
  );
  const items = useMemo((): readonly (RepositoryWorkflowReportListItem | BackMenuItem)[] => {
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
      routeTitle: 'Repository Workflow Reports',
      selectedContext,
    }),
    [selectedContext],
  );
  const reportFocusedContext = useCallback(
    (item: RepositoryWorkflowReportListItem | BackMenuItem | undefined): void => {
      if (item == null || isBackMenuItem(item)) {
        setSelectedContext(undefined);
        return;
      }

      setSelectedContext(item.context);
    },
    [],
  );

  const handleSelect = useCallback(
    (item: RepositoryWorkflowReportListItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      session.pushRoute('repository-workflow-report-detail', item.summary.directoryName);
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
    void listTaskSpecSummaries(session.projectRoot)
      .then((taskSpecs) =>
        session.services.repositoryWorkflowReports.listReportSummaries(
          session.projectRoot,
          taskSpecs.recognized,
        ),
      )
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
  }, [session.projectRoot, session.services.repositoryWorkflowReports]);

  if (error != null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Repository Workflow Reports</Text>
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
        <Text bold>Repository Workflow Reports</Text>
        <Text color="gray">Loading repository workflow reports...</Text>
      </Box>
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        summaries.length === 0 ? (
          <Box flexDirection="column">
            <Text color="yellow">No repository workflow reports found.</Text>
            <SelectableList
              items={items}
              onFocusChange={reportFocusedContext}
              onSelect={handleSelect}
            />
          </Box>
        ) : (
          <SelectableList
            items={items}
            onFocusChange={reportFocusedContext}
            onSelect={handleSelect}
          />
        )
      }
    />
  );
}
