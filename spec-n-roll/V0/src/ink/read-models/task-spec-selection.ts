import type { TaskSpecIdentity } from '../../sdk/workflow/engine.js';
import { listActiveTaskSpecs } from '../../sdk/workflow/engine.js';

/**
 * In-memory state needed to resolve a task spec for a mutation flow.
 */
export interface TaskSpecSelectionSession {
  /**
   * Currently selected task spec, if a prior screen already established one.
   */
  selectedTaskSpec: TaskSpecIdentity | null;
  /**
   * Replaces the selected task spec in the active session.
   */
  setSelectedTaskSpec: (taskSpec: TaskSpecIdentity | null) => void;
}

/**
 * Prompt payload for resolving multiple active task specs.
 */
export interface TaskSpecSelectionPrompt {
  /**
   * Candidate task specs shown in one-based numeric order.
   */
  candidates: readonly TaskSpecIdentity[];
}

/**
 * Result of resolving a mutation target task spec.
 */
export type TaskSpecSelectionResult =
  | { kind: 'selected'; taskSpec: TaskSpecIdentity }
  | { kind: 'prompt'; prompt: TaskSpecSelectionPrompt }
  | { kind: 'error'; message: string; remediation: string };

/**
 * Resolves the task spec that a mutation should target.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param session - In-memory selected task spec state for the current session.
 * @returns Selection result, prompt request, or recoverable error details.
 */
export async function resolveTaskSpecForMutation(
  projectRoot: string,
  session: TaskSpecSelectionSession,
): Promise<TaskSpecSelectionResult> {
  if (session.selectedTaskSpec != null) {
    return { kind: 'selected', taskSpec: session.selectedTaskSpec };
  }

  const activeTaskSpecs = await listActiveTaskSpecs(projectRoot);
  if (activeTaskSpecs.length === 0) {
    return {
      kind: 'error',
      message: 'No Active task spec is available for this mutation.',
      remediation: 'Set a task spec to Active or create one before running task-specific actions.',
    };
  }

  if (activeTaskSpecs.length === 1) {
    const only = activeTaskSpecs[0]!;
    session.setSelectedTaskSpec(only);
    return { kind: 'selected', taskSpec: only };
  }

  return { kind: 'prompt', prompt: { candidates: activeTaskSpecs } };
}
