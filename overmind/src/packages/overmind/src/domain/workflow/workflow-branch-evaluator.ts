import type { WorkflowBranch } from '../cerebrate/cerebrate-definition.js';

export interface WorkflowCommandResult {
  output: string;
  status: string;
}

export function evaluateWorkflowBranch(
  branches: WorkflowBranch[],
  result: WorkflowCommandResult,
): WorkflowBranch | undefined {
  return branches.find((branch) => matchesBranch(branch, result));
}

function matchesBranch(branch: WorkflowBranch, result: WorkflowCommandResult): boolean {
  const { when } = branch;

  if (when.outputContains !== undefined && !result.output.includes(when.outputContains)) {
    return false;
  }

  if (when.outputRegex !== undefined && !(new RegExp(when.outputRegex).test(result.output))) {
    return false;
  }

  if (when.statusEquals !== undefined && result.status !== when.statusEquals) {
    return false;
  }

  return true;
}
