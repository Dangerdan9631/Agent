# Feature Specification: Cerebrate Workflows

**Feature Branch**: `002-cerebrate-workflows`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Cerebrate configs should be able to define a set of states, and workflows. A state has a name and a command that is run. It can be any of the same commands that can be invoked via send-command. Each state should also define a next state. A workflow has a name, and an initial state. There should be a cli/sdk call to start a cerebrate workflow. That should start a state machine with the specified initial state. That state should invoke the command for that state, then when complete, transition to the specified next state. If the specified next state is 'END', then it completes the workflow. Each workflow state transition should log the transition to the overminds log stream. Include conditional branches into the specification. Also add support for handling error cases."

## Purpose

Add config-defined workflows to cerebrates so repeatable command sequences can run
inside the Overmind service. Workflows are state machines: each state invokes one
existing cerebrate command, then transitions to the configured next state until the
reserved `END` sentinel completes the workflow. States can optionally define
ordered conditional branches based on command results and an error transition for
recoverable command failures.

## Scope

### In scope

- Extend `cerebrate-config.yaml` with workflow state definitions
- Extend `cerebrate-config.yaml` with named workflow entry points
- Add CLI and SDK operations to start a named workflow for a running cerebrate
- Execute workflow state machines in the service, not in CLI or SDK clients
- Reuse the same command dispatch path as `send-command`
- Support deterministic conditional branches after state command completion
- Support explicit error handling when a state command fails
- Log each workflow transition to the service/global Overmind log stream

### Out of scope

- Parallel workflow execution for the same cerebrate
- Workflow pause, resume, retry, or cancellation controls
- Arbitrary scripting or Turing-complete expression languages for branch conditions
- UI or MCP workflow surfaces
- New command types beyond commands already valid for `send-command`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define workflow states in cerebrate config (Priority: P1)

An operator defines a reusable workflow in `cerebrate-config.yaml` using named
states and workflow entry points.

**Why this priority**: Workflow execution cannot be deterministic without a
validated config model.

**Independent Test**: Load a cerebrate config with states, branches, error handlers,
and one workflow; verify state names, commands, transition references, conditions,
and `initialState` are validated.

**Acceptance Scenarios**:

1. **Given** a cerebrate config with `states`,
   **When** the service loads the cerebrate definition,
   **Then** each state has a unique `name`, a `command`, and a `next` value.
2. **Given** a cerebrate config with `workflows`,
   **When** the service loads the cerebrate definition,
   **Then** each workflow has a unique `name` and an `initialState` that references
   a configured state.
3. **Given** a state uses `END` as its `next` value,
   **When** validation runs,
   **Then** `END` is accepted only as a terminal sentinel and not as a state name.
4. **Given** a state defines conditional branches,
   **When** validation runs,
   **Then** each branch has a condition and a target that references another state
   or `END`.
5. **Given** a state defines `onError`,
   **When** validation runs,
   **Then** the error target references another state or `END`.

---

### User Story 2 - Start a workflow from CLI or SDK (Priority: P1)

An operator or SDK consumer starts a workflow for a running cerebrate.

**Why this priority**: All control surfaces must go through the SDK and service IPC
contract.

**Independent Test**: Start a running cerebrate, invoke the workflow start command
through CLI and SDK, and verify the service returns workflow identity and initial
state.

**Acceptance Scenarios**:

1. **Given** a running cerebrate with a valid workflow,
   **When** the operator runs `overmind start-workflow <cerebrate> <workflow>`,
   **Then** the CLI delegates to `overmind-sdk` and the service starts the workflow
   at the workflow's configured initial state.
2. **Given** a valid SDK instance,
   **When** the caller invokes `startCerebrateWorkflow({ cerebrateName, workflowName })`,
   **Then** the SDK delegates through IPC to the service and returns
   `{ cerebrateName, workflowName, initialState, status: 'running' }`.

---

### User Story 3 - Execute workflow state transitions and branches (Priority: P1)

The service executes each workflow state command and advances through default or
conditional transitions until completion.

**Why this priority**: The workflow feature is defined by correct command ordering
and state transitions.

**Independent Test**: Define a workflow with a default path and one conditional
branch, start it, verify commands are invoked in the selected order, and verify the
workflow completes on `END`.

**Acceptance Scenarios**:

1. **Given** the workflow state machine enters a state,
   **When** that state runs,
   **Then** the service invokes the state's configured command using the same
   command contract as `send-command` for that cerebrate.
2. **Given** a state command completes and the state's `next` value is another state
   name,
   **When** no conditional branch matches,
   **Then** the service executes the next state.
3. **Given** a state command completes and one conditional branch matches,
   **When** branch evaluation occurs,
   **Then** the service transitions to the matching branch target instead of the
   state's default `next` target.
4. **Given** multiple conditional branches match,
   **When** branch evaluation occurs,
   **Then** the service uses the first matching branch in config order.
5. **Given** a state command completes and the selected transition target is `END`,
   **When** the transition occurs,
   **Then** the service marks the workflow complete and invokes no further commands.

---

### User Story 4 - Handle workflow command errors (Priority: P1)

The service handles command failures deterministically using configured error
transitions or a failed workflow status.

**Why this priority**: Workflows must be safe to run unattended and must not hide
failed commands.

**Independent Test**: Define one workflow state whose command fails, verify an
`onError` transition is followed when configured, and verify the workflow fails and
logs the error when `onError` is absent.

**Acceptance Scenarios**:

1. **Given** a state command fails and the state defines `onError`,
   **When** error handling runs,
   **Then** the service logs the error and transitions to the configured error
   target.
2. **Given** a state command fails and the state does not define `onError`,
   **When** error handling runs,
   **Then** the workflow is marked `failed`, no further state commands are invoked,
   and the failure is logged to the service/global Overmind log stream.
3. **Given** an `onError` target is `END`,
   **When** the state command fails,
   **Then** the workflow completes after logging that the error path completed the
   workflow.

---

### User Story 5 - Observe workflow progress in Overmind logs (Priority: P2)

An operator attaches to service/global logs and watches workflow transitions.

**Why this priority**: Workflows can run asynchronously; operators need visibility
without attaching to a specific cerebrate stream.

**Independent Test**: Start a workflow while an unnamed attach stream is active;
verify each state transition and completion is emitted to the service/global log
stream.

**Acceptance Scenarios**:

1. **Given** a workflow transitions from one state to another through default,
   branch, or error handling,
   **When** the transition occurs,
   **Then** the service writes a transition log entry to the service/global Overmind
   log stream.
2. **Given** a workflow transitions to `END`,
   **When** the workflow completes,
   **Then** the service writes a completion log entry to the service/global Overmind
   log stream.
3. **Given** the operator runs unnamed `attach`,
   **When** workflow transitions are logged,
   **Then** the attach stream emits those log entries.

---

### Edge Cases

- **Missing workflow**: Starting an unknown workflow MUST fail with a clear error.
- **Missing initial state**: A workflow whose `initialState` is not defined MUST fail
  validation before any command is invoked.
- **Missing next state**: A non-`END` `next` value that does not reference a state
  MUST fail validation before workflow execution.
- **Missing branch target**: A non-`END` branch target that does not reference a
  state MUST fail validation before workflow execution.
- **Missing error target**: A non-`END` `onError` target that does not reference a
  state MUST fail validation before workflow execution.
- **Reserved state name**: `END` MUST NOT be accepted as a configured state name.
- **Command failure**: If a state command fails, the workflow MUST stop, log the
  failed state and command to the service/global log stream, and mark the workflow
  run as `failed` unless the state defines `onError`.
- **Branch condition mismatch**: If no branch matches after a successful command,
  the workflow MUST use the state's default `next` transition.
- **Ambiguous branch match**: If multiple branches match, the workflow MUST use the
  first matching branch in config order.
- **Invalid condition**: Unsupported or malformed branch conditions MUST fail config
  validation before workflow execution.
- **Error handler loop**: Error transitions MAY point to any valid state, including
  a previous state; loop detection is not required, but every transition MUST be
  logged.
- **Concurrent workflow start**: Starting a second workflow for the same cerebrate
  while one is active MUST fail clearly.
- **Stopped cerebrate**: Starting a workflow for a stopped or unknown cerebrate MUST
  fail clearly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cerebrate config files MUST support a `states` collection.
- **FR-002**: Each workflow state MUST define a unique `name`, a `command`, and a
  default `next` value.
- **FR-003**: A workflow state's `command` MUST be valid anywhere
  `send-command` can invoke it for the same cerebrate.
- **FR-004**: A workflow state's `next` value MUST be either another configured state
  name or reserved sentinel `END`.
- **FR-005**: `END` MUST be reserved and MUST NOT be accepted as a user-defined state
  name.
- **FR-006**: A workflow state MAY define ordered `branches`; each branch MUST define
  a condition and a target state name or `END`.
- **FR-007**: Branch conditions MUST be evaluated only after the state's command
  completes successfully.
- **FR-008**: If multiple branches match, the first matching branch in config order
  MUST be selected.
- **FR-009**: If no branch matches, workflow execution MUST use the state's default
  `next` value.
- **FR-010**: A workflow state MAY define `onError`; it MUST reference a configured
  state or `END`.
- **FR-011**: If a state command fails and `onError` is configured, workflow execution
  MUST log the error and transition to the `onError` target.
- **FR-012**: If a state command fails and `onError` is not configured, workflow
  execution MUST mark the workflow `failed`, stop invoking commands, and log the
  failure to the service/global Overmind log stream.
- **FR-013**: Cerebrate config files MUST support a `workflows` collection.
- **FR-014**: Each workflow MUST define a unique `name` and an `initialState` that
  references a configured state.
- **FR-015**: The CLI MUST expose `start-workflow <cerebrate> <workflow>` with
  `--config-dir` support.
- **FR-016**: The SDK MUST expose `startCerebrateWorkflow({ cerebrateName, workflowName })`.
- **FR-017**: The service IPC API MUST expose `startCerebrateWorkflow`.
- **FR-018**: Starting a workflow MUST create a service-owned workflow state machine
  at the workflow's configured `initialState`.
- **FR-019**: Workflow execution MUST invoke the current state's command, wait for
  completion, evaluate branches when the command succeeds, and transition to the
  selected target.
- **FR-020**: If a selected transition target is `END`, workflow execution MUST
  complete.
- **FR-021**: Every workflow state transition MUST be written to the service/global
  Overmind log stream and MUST identify whether the transition was default, branch,
  error, or completion.
- **FR-022**: Workflow completion via `END` MUST be written to the service/global
  Overmind log stream.
- **FR-023**: Workflow execution MUST reject concurrent workflow starts for the same
  cerebrate unless a future spec defines concurrency.
- **FR-024**: The CLI MUST remain thin and MUST NOT load cerebrate YAML, run workflow
  state machines, or invoke workflow commands directly.

### Key Entities

- **Workflow State**: A configured cerebrate step with `name`, `command`, default
  `next`, optional ordered `branches`, and optional `onError`.
- **Workflow Branch**: An ordered conditional transition evaluated against a
  successful command result.
- **Workflow Definition**: A named workflow entry point with `name` and
  `initialState`.
- **Workflow Run**: A service-owned runtime state machine for one cerebrate workflow;
  status is `running`, `completed`, or `failed`.
- **Workflow Transition Log Entry**: A service/global log line emitted whenever a
  workflow changes state, handles an error, completes, or fails.

## Config Shape

Workflow states keep `next` as the default successful transition. `branches` are
evaluated in order after the command succeeds. `onError` is used only when the
command fails.

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

Supported branch condition fields are intentionally small and deterministic:

- `outputContains`: matches when command output contains the configured string.
- `outputRegex`: matches when command output matches the configured regular expression.
- `statusEquals`: matches a normalized command result status such as `success`.

At least one condition field is required per branch. If multiple fields are present,
all fields in that branch must match.

## Success Criteria *(mandatory)*

- **SC-001**: A two-state workflow starts through CLI and SDK and completes in order
  on a local developer machine.
- **SC-002**: The same command implementation used by `send-command` is used for
  workflow state commands.
- **SC-003**: A workflow with two matching branch conditions chooses the first branch
  in config order.
- **SC-004**: A workflow with no matching branch follows the state's default `next`.
- **SC-005**: A workflow state with `onError` transitions to the configured error
  target after command failure.
- **SC-006**: A workflow state without `onError` fails the workflow after command
  failure.
- **SC-007**: Unnamed `attach` observes every workflow transition log entry,
  including completion to `END`.
- **SC-008**: Invalid workflow configs fail before command execution with a clear
  validation error.
- **SC-009**: Concurrent workflow starts for the same cerebrate fail clearly.

## Command & Capability Matrix

| Surface | Operation | Status |
|---------|-----------|--------|
| CLI | `start-workflow <cerebrate> <workflow>` | Planned |
| SDK | `startCerebrateWorkflow({ cerebrateName, workflowName })` | Planned |
| IPC | `startCerebrateWorkflow(request)` | Planned |
| Config | `states[]`, `states[].branches[]`, `states[].onError`, `workflows[]` | Planned |
| Logs | service/global workflow transition and error entries | Planned |
