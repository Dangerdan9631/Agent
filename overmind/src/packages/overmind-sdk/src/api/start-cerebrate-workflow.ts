import { OvermindError } from './overmind-error';

export interface StartCerebrateWorkflowRequest {
  cerebrateName: string;
  workflowName: string;
}

export interface StartCerebrateWorkflowResponse {
  cerebrateName: string;
  workflowName: string;
  initialState: string;
  status: 'running';
}

export class StartCerebrateWorkflowError extends OvermindError { }
