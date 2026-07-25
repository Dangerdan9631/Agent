/**
 * Lists workflow state fields that hook context patches may never mutate.
 */
export const WORKFLOW_RUN_CONTROL_FIELDS = [
  'contractVersion',
  'runId',
  'currentStepId',
  'attemptCount',
  'completionStatus',
  'hookOutcomes',
] as const;

