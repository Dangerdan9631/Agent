# Data Model: 002-cerebrate-workflows

**Date**: 2026-06-03

## Cerebrate Definition Extension

Workflow fields are added to `cerebrates/<name>/cerebrate-config.yaml`.

| Field | Type | Rules |
|-------|------|-------|
| `states` | WorkflowState[] | Optional; state names must be unique and cannot be `END` |
| `workflows` | WorkflowDefinition[] | Optional; workflow names must be unique |

Example:

```yaml
states:
  - name: inspect
    command: run
    next: summarize
    branches:
      - when:
          outputContains: "needs-validation"
        next: validate
      - when:
          outputContains: "skip"
        next: END
    onError: recover
  - name: validate
    command: validate
    next: END
  - name: summarize
    command: summarize
    next: END
  - name: recover
    command: shutdown
    next: END
workflows:
  - name: daily-review
    initialState: inspect
```

## Workflow State

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Required; unique within cerebrate config; MUST NOT equal `END` |
| `command` | string | Required; valid for existing `send-command` dispatch |
| `next` | string | Required default success target; state name or `END` |
| `branches` | WorkflowBranch[] | Optional; evaluated in order after command success |
| `onError` | string | Optional failure target; state name or `END` |

## Workflow Branch

| Field | Type | Rules |
|-------|------|-------|
| `when` | BranchCondition | Required; at least one condition field |
| `next` | string | Required branch target; state name or `END` |

## Branch Condition

| Field | Type | Rules |
|-------|------|-------|
| `outputContains` | string | Optional; command output must include value |
| `outputRegex` | string | Optional; command output must match regex |
| `statusEquals` | string | Optional; normalized command status must equal value |

If multiple condition fields are present, all must match. Branches are evaluated
only after successful command completion, so the supported status for this feature
is `success`.

## Workflow Definition

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Required; unique within cerebrate config |
| `initialState` | string | Required; references configured WorkflowState |

## Workflow Run

| Field | Type | Rules |
|-------|------|-------|
| `cerebrateName` | string | Required; target cerebrate must be running |
| `workflowName` | string | Required; target workflow must exist |
| `currentState` | string | Current state while running |
| `status` | enum | `running`, `completed`, or `failed` |
| `startedAt` | timestamp | Set when workflow run is registered |
| `completedAt` | timestamp \| undefined | Set on `END` or failure |
| `lastError` | string \| undefined | Set when a command failure is not recovered |

## Workflow Transition Log Entry

| Field | Type | Rules |
|-------|------|-------|
| `cerebrateName` | string | Required |
| `workflowName` | string | Required |
| `fromState` | string | Required for state transitions |
| `toState` | string | State name or `END` |
| `transitionType` | enum | `default`, `branch`, `error`, `completion`, or `failure` |
| `message` | string | Human-readable log output |

## Validation Rules

- State names must be unique.
- Workflow names must be unique.
- `END` is reserved and cannot be used as a state name.
- Workflow `initialState` must reference a configured state.
- State `next`, branch `next`, and `onError` must reference a state or `END`.
- Every branch must define at least one supported condition field.
- Unsupported condition fields fail validation.
- `outputRegex` must compile successfully.
- A workflow cannot start when the target cerebrate already has an active workflow.
