# Contract: IPC Workflow API

**Package**: `overmind-sdk` (`src/ipc/overmind-ipc-api.ts`)

**Implementer**: `packages/overmind`

## `startCerebrateWorkflow(request): Promise<StartCerebrateWorkflowResponse>`

**Request**:

```typescript
{
  cerebrateName: string;
  workflowName: string;
}
```

**Response**:

```typescript
{
  cerebrateName: string;
  workflowName: string;
  initialState: string;
  status: 'running';
}
```

## Service Behavior

- Locates the running cerebrate by `cerebrateName`
- Locates the workflow definition by `workflowName`
- Rejects the request if the cerebrate already has an active workflow
- Registers a workflow run at `workflow.initialState`
- Returns after registration
- Continues workflow execution inside the service
- Emits transition and error logs to the service/global log stream

## Runtime Errors

- `cerebrate not running`
- `workflow not found`
- `workflow config invalid`
- `workflow already running`

Runtime command failure after registration is reported through workflow logs and
workflow run status. If the failure occurs before registration, the IPC call rejects.
