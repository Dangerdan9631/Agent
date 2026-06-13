import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { useSession } from '../../app/session-context.js';
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
  summary: TaskSpecSummary;
}

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
    summary,
  }));
}

/**
 * Renders recognized and unrecognized task spec directories.
 *
 * @returns React element for the task specs browse screen.
 */
export function SpecsListScreen(): React.ReactElement {
  const session = useSession();
  const [summaries, setSummaries] = useState<TaskSpecSummaryList | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const openSummary = (item: TaskSpecListItem): void => {
    if (item.summary.taskSpecId == null || item.summary.slug == null) {
      return;
    }

    session.setSelectedTaskSpec({
      taskSpecId: item.summary.taskSpecId,
      slug: item.summary.slug,
      label: item.summary.directoryName,
    });
    session.pushRoute('spec-detail', item.summary.directoryName);
  };

  if (error != null) {
    return (
      <Box flexDirection="column">
        <Text bold>Task Specs</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (summaries == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Task Specs</Text>
        <Text color="gray">Loading task specs...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Task Specs</Text>
      {summaries.recognized.length === 0 ? (
        <Text color="gray">No recognized task specs found.</Text>
      ) : (
        <SelectableList items={buildTaskSpecItems(summaries.recognized)} onSelect={openSummary} />
      )}
      {summaries.unrecognized.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Unrecognized</Text>
          {summaries.unrecognized.map((summary) => (
            <Text key={summary.directoryName} color="yellow">
              ! {summary.directoryName} - {summary.warnings.join(' ')}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
