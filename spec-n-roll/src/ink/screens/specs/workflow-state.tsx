import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import {
  readWorkflowState,
  writeWorkflowState,
  type WorkflowStateWriteInput,
} from '../../../sdk/core/workflow-state.js';
import type { TaskSpecIdentity } from '../../../sdk/workflow/engine.js';
import type { WorkflowState } from '../../../sdk/workflow/state.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';

/**
 * Input accepted by the interactive workflow state mutation path.
 */
export interface InteractiveWorkflowStateWriteInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Workflow state document to validate and persist.
   */
  state: WorkflowStateWriteInput;
  /**
   * Called before overwriting an existing state file; must resolve true to continue.
   */
  confirmOverwrite: () => Promise<boolean> | boolean;
}

/**
 * Applies the interactive workflow state write after explicit overwrite confirmation.
 *
 * @param input - Project root, workflow state payload, and confirmation callback.
 * @returns Persisted workflow state with the core writer's updated timestamp.
 */
export async function applyInteractiveWorkflowStateWrite(
  input: InteractiveWorkflowStateWriteInput,
): Promise<WorkflowState> {
  const existing = await readWorkflowState(input.projectRoot, input.state.taskSpecId, input.state.slug);
  if (existing != null) {
    const confirmed = await input.confirmOverwrite();
    if (!confirmed) {
      throw new Error('Workflow state overwrite cancelled.');
    }
  }

  return writeWorkflowState(input.projectRoot, input.state);
}

/**
 * Operational workflow states accepted by workflow-state.json.
 */
const WORKFLOW_STATUSES: readonly WorkflowState['status'][] = ['active', 'paused', 'complete'];

/**
 * Returns the next workflow operational status.
 *
 * @param status - Current status before cycling.
 * @returns Next status in the supported status order.
 */
function nextStatus(status: WorkflowState['status']): WorkflowState['status'] {
  const index = WORKFLOW_STATUSES.indexOf(status);
  return WORKFLOW_STATUSES[(index + 1) % WORKFLOW_STATUSES.length] ?? 'active';
}

/**
 * Builds a writable workflow state payload from the existing state and selected task spec.
 *
 * @param taskSpec - Selected task spec identity.
 * @param existing - Existing workflow state, if present.
 * @param status - Target operational status.
 * @returns Workflow state write input preserving existing workflow fields where possible.
 */
function buildWorkflowStateInput(
  taskSpec: TaskSpecIdentity,
  existing: WorkflowState | null,
  status: WorkflowState['status'],
): WorkflowStateWriteInput {
  return {
    taskSpecId: taskSpec.taskSpecId,
    slug: taskSpec.slug,
    workflowVariantId: existing?.workflowVariantId ?? 'quick',
    lastCompletedStepId: existing?.lastCompletedStepId ?? null,
    currentStepId: status === 'complete' ? null : (existing?.currentStepId ?? null),
    status,
    interruptedArtifacts: existing?.interruptedArtifacts,
  };
}

/**
 * Renders workflow state details and a confirmed status write action.
 *
 * @returns React element for the workflow state mutation screen.
 */
export function WorkflowStateScreen(props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const [existing, setExisting] = useState<WorkflowState | null>(null);
  const [status, setStatus] = useState<WorkflowState['status']>('active');
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotHeight = props.routeContentRows > 0 ? props.routeContentRows : undefined;

  useEffect(() => {
    let active = true;
    if (selected == null) {
      return () => {
        active = false;
      };
    }

    void readWorkflowState(session.projectRoot, selected.taskSpecId, selected.slug)
      .then((state) => {
        if (active) {
          setExisting(state);
          setStatus(state?.status ?? 'active');
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        }
      });

    return () => {
      active = false;
    };
  }, [selected, session.projectRoot]);

  const applyWrite = (): void => {
    if (selected == null) {
      return;
    }

    setError(null);
    void applyInteractiveWorkflowStateWrite({
      projectRoot: session.projectRoot,
      state: buildWorkflowStateInput(selected, existing, status),
      confirmOverwrite: () => true,
    })
      .then((state) => {
        setExisting(state);
        setMessage(`workflow status: ${state.status}`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      })
      .finally(() => {
        setConfirming(false);
      });
  };

  useInput((input, key) => {
    if (selected == null || confirming) {
      return;
    }

    if (input === 's') {
      setStatus((current) => nextStatus(current));
      return;
    }

    if (key.return) {
      setConfirming(true);
    }
  });

  if (confirming) {
    return (
      <ConfirmDialog
        title={existing == null ? 'Write workflow state?' : 'Overwrite workflow state?'}
        message={
          existing == null
            ? 'This will create workflow-state.json through the core workflow state writer.'
            : 'This will rewrite workflow-state.json through the core workflow state writer.'
        }
        onConfirm={applyWrite}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column" height={slotHeight}>
      <Text bold>Workflow State</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <Text>set list: {existing?.workflowVariantId ?? 'quick'}</Text>
          <Text>last completed: {existing?.lastCompletedStepId ?? 'none'}</Text>
          <Text>current step: {existing?.currentStepId ?? 'none'}</Text>
          <Text>status: {status} (s cycle, Enter apply)</Text>
        </>
      )}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
