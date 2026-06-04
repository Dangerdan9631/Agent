import type { CerebrateCommand } from './cerebrate-command.js';

export interface WorkflowBranchCondition {
  outputContains?: string;
  outputRegex?: string;
  statusEquals?: string;
}

export interface WorkflowBranch {
  when: WorkflowBranchCondition;
  next: string;
}

export interface WorkflowStateDefinition {
  name: string;
  command: string;
  next: string;
  branches: WorkflowBranch[];
  onError?: string;
}

export interface WorkflowDefinition {
  name: string;
  initialState: string;
}

export interface CerebrateDefinition {
  name: string;
  description: string;
  taskId: string;
  responsibilities: string;
  commands: CerebrateCommand[];
  states: WorkflowStateDefinition[];
  workflows: WorkflowDefinition[];
  cerebrateDir: string;
}
