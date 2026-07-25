import type { WorkflowHookResultV1 } from '#api/contracts/workflow/workflow-hook-result-v1.js';
import type { WorkflowRunStateV1 } from '#api/contracts/workflow/workflow-run-state-v1.js';

/**
 * Defines the first agent-neutral workflow hook execution contract.
 */
export interface WorkflowHookV1 {
  /**
   * Evaluates an immutable workflow snapshot and proposes a structured outcome.
   *
   * @param snapshot - Deeply immutable snapshot owned by the workflow core.
   * @returns The structured result proposed for validation and application.
   */
  execute(snapshot: WorkflowRunStateV1): Promise<WorkflowHookResultV1>;
}

