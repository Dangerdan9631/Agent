import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { useSession } from '../../app/session-context.js';
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
    summary,
  }));
}

/**
 * Renders configured workflow variants for read-only browsing.
 *
 * @returns React element for the workflows list screen.
 */
export function WorkflowsListScreen(): React.ReactElement {
  const session = useSession();
  const [summaries, setSummaries] = useState<WorkflowVariantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        items={buildWorkflowItems(summaries)}
        onSelect={(item) => session.pushRoute('workflow-detail', item.summary.variantId)}
      />
    </Box>
  );
}
