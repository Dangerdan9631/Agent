# Contract: SDK Workflow API

**Package**: `overmind-sdk`

## Operation

```typescript
interface OvermindApi {
  startCerebrateWorkflow(
    request: StartCerebrateWorkflowRequest,
  ): Promise<StartCerebrateWorkflowResponse>;
}

type StartCerebrateWorkflowRequest = {
  cerebrateName: string;
  workflowName: string;
};

type StartCerebrateWorkflowResponse = {
  cerebrateName: string;
  workflowName: string;
  initialState: string;
  status: 'running';
};
```

## Behavior

- Delegates to `OvermindIpcClient.startCerebrateWorkflow`
- Does not read workflow config
- Does not execute workflow state machines
- Preserves service errors for unknown cerebrates, unknown workflows, invalid
  workflow definitions, and active workflow conflicts

## Consumers

- `overmind-cli` command `start-workflow`
- Future UI and MCP surfaces
