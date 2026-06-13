import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { assembleTaskSpecSummary, type TaskSpecSummary } from '../../read-models/task-specs.js';

/**
 * Formats artifact presence for detail display.
 *
 * @param summary - Task spec summary containing artifact flags.
 * @returns Human-readable artifact presence text.
 */
function formatArtifacts(summary: TaskSpecSummary): string {
  return [
    `spec:${summary.artifacts.spec ? 'yes' : 'no'}`,
    `plan:${summary.artifacts.plan ? 'yes' : 'no'}`,
    `tasks:${summary.artifacts.tasks ? 'yes' : 'no'}`,
  ].join(' ');
}

/**
 * Renders read-only workflow and artifact details for the selected task spec.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the task spec detail screen.
 */
export function SpecDetailScreen(props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const [summary, setSummary] = useState<TaskSpecSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotHeight = props.routeContentRows > 0 ? props.routeContentRows : undefined;

  useInput((input) => {
    if (input === 'm' && selected != null) {
      session.pushRoute('spec-mutations', selected.label);
    }
  });

  useEffect(() => {
    let active = true;
    if (selected == null) {
      setSummary(null);
      return () => {
        active = false;
      };
    }

    void assembleTaskSpecSummary(
      session.projectRoot,
      `${selected.taskSpecId}-${selected.slug}`,
    )
      .then((result) => {
        if (active) {
          setSummary(result);
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
  }, [selected, session.projectRoot]);

  if (selected == null) {
    return (
      <Box flexDirection="column" height={slotHeight}>
        <Text bold>Spec Detail</Text>
        <Text color="yellow">No task spec is selected.</Text>
      </Box>
    );
  }

  if (error != null) {
    return (
      <Box flexDirection="column" height={slotHeight}>
        <Text bold>Spec Detail</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (summary == null) {
    return (
      <Box flexDirection="column" height={slotHeight}>
        <Text bold>Spec Detail</Text>
        <Text color="gray">Loading task spec...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={slotHeight}>
      <Text bold>
        Spec {summary.taskSpecId}-{summary.slug}
      </Text>
      <Text>lifecycle: {summary.lifecycleStatus}</Text>
      <Text>Workflow state</Text>
      <Text>status: {summary.operationalStatus}</Text>
      <Text>variant: {summary.workflowVariantId ?? 'none'}</Text>
      <Text>current step: {summary.currentStepId ?? 'none'}</Text>
      <Text>last completed step: {summary.lastCompletedStepId ?? 'none'}</Text>
      <Text>artifacts: {formatArtifacts(summary)}</Text>
      <Text color="gray">m mutations</Text>
      {summary.warnings.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Warnings</Text>
          {summary.warnings.map((warning) => (
            <Text key={warning} color="yellow">
              ! {warning}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
