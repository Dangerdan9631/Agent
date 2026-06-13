import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import { useSession } from '../../app/session-context.js';
import {
  listWorkflowVariantSummaries,
  type WorkflowVariantSummary,
} from '../../read-models/workflow-variants.js';

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
 * Renders one workflow variant in expanded read-only form.
 *
 * @returns React element for the workflow detail screen.
 */
export function WorkflowDetailScreen(): React.ReactElement {
  const session = useSession();
  const variantId = currentContextLabel(session.navigationStack);
  const [summary, setSummary] = useState<WorkflowVariantSummary | null>(null);

  useEffect(() => {
    let active = true;
    void listWorkflowVariantSummaries(session.projectRoot).then((summaries) => {
      if (active) {
        setSummary(summaries.find((candidate) => candidate.variantId === variantId) ?? null);
      }
    });

    return () => {
      active = false;
    };
  }, [session.projectRoot, variantId]);

  if (variantId == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Workflow Detail</Text>
        <Text color="yellow">No workflow is selected.</Text>
      </Box>
    );
  }

  if (summary == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Workflow {variantId}</Text>
        <Text color="gray">Loading workflow...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Workflow {summary.variantId}</Text>
      <Text>{summary.displayName}</Text>
      {summary.description != null ? <Text color="gray">{summary.description}</Text> : null}
      <Text>steps:</Text>
      {summary.stepSequence.map((stepId, index) => (
        <Text key={stepId}>
          {index + 1}. {summary.stepLabels[stepId] ?? stepId} ({stepId})
        </Text>
      ))}
    </Box>
  );
}
