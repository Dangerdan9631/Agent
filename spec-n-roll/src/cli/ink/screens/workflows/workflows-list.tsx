import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';

import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { useSelectionRowContribution } from '../../components/SelectionRegion.js';
import { useSession } from '../../app/session-context.js';
import type { SelectedContextChangeHandler } from '../../app/App.js';
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
export interface WorkflowsListScreenProps {
  /**
   * Called when keyboard focus moves to a workflow row with read-only context.
   */
  onContextChange?: SelectedContextChangeHandler;
}

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
    summary: summary.description ?? `${summary.displayName} workflow variant.`,
    status: summary.isDefault
      ? 'Default workflow for this project.'
      : 'Additional workflow variant.',
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
 * Renders configured workflow variants for read-only browsing.
 *
 * @returns React element for the workflows list screen.
 */
export function WorkflowsListScreen(props: WorkflowsListScreenProps): React.ReactElement {
  const session = useSession();
  const [summaries, setSummaries] = useState<WorkflowVariantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(
    () => (summaries == null ? [] : buildWorkflowItems(summaries)),
    [summaries],
  );
  const reportFocusedContext = useCallback(
    (item: WorkflowListItem | undefined): void => {
      props.onContextChange?.(item?.context);
    },
    [props.onContextChange],
  );
  const extraRows = useMemo(() => {
    if (error != null) {
      return 2;
    }

    if (summaries == null) {
      return 2;
    }

    return 1;
  }, [error, summaries]);
  useSelectionRowContribution(extraRows);

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
      <Box flexDirection="column">
        <Text bold>Workflows</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (summaries == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Workflows</Text>
        <Text color="gray">Loading workflows...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Workflows</Text>
      <SelectableList
        items={items}
        onFocusChange={reportFocusedContext}
        onSelect={(item) => session.pushRoute('workflow-detail', item.summary.variantId)}
      />
    </Box>
  );
}
