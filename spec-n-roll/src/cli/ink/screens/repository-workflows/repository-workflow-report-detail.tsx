import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import type { RepositoryWorkflowReportSummary } from '../../../../sdk/interactive/repository-workflows.js';

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
 * Renders one repository workflow report in expanded read-only form.
 *
 * @returns React element for the repository workflow report detail screen.
 */
export function RepositoryWorkflowReportDetailScreen(
  _props: RoutedScreenProps,
): React.ReactElement {
  const session = useSession();
  const directoryName = currentContextLabel(session.navigationStack);
  const [summary, setSummary] = useState<RepositoryWorkflowReportSummary | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (directoryName == null) {
      return () => {
        active = false;
      };
    }

    void session.services.repositoryWorkflowReports
      .assembleReportSummary(session.projectRoot, directoryName)
      .then(async (loadedSummary) => {
        if (!active) {
          return;
        }

        setSummary(loadedSummary);
        if (!loadedSummary.hasReport) {
          setMarkdown(null);
          return;
        }

        const report = await session.services.repositoryWorkflowReports.readReport(
          session.projectRoot,
          loadedSummary.taskSpecId,
          loadedSummary.slug,
        );
        if (active) {
          setMarkdown(report.markdown);
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
  }, [directoryName, session.projectRoot, session.services.repositoryWorkflowReports]);

  if (directoryName == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Repository Workflow Report</Text>
        <Text color="yellow">No report is selected.</Text>
      </Box>
    );
  }

  if (error != null) {
    return (
      <Box flexDirection="column">
        <Text bold>Repository Workflow Report</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (summary == null || markdown == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Repository Workflow Report</Text>
        <Text color="gray">Loading report...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{summary.directoryName}</Text>
      {summary.workflowTypeName != null ? <Text>{summary.workflowTypeName}</Text> : null}
      {summary.specifyOutputRef != null ? (
        <Text color="gray">Specify output: {summary.specifyOutputRef}</Text>
      ) : null}
      <Text> </Text>
      {markdown.split('\n').map((line, index) => (
        <Text key={`${index}-${line}`}>{line.length > 0 ? line : ' '}</Text>
      ))}
    </Box>
  );
}
