# Research: 002-cerebrate-workflows

**Date**: 2026-06-03

## R1: Workflow runtime ownership

**Decision**: Workflow state machines run in `packages/overmind`, owned by the
service.

**Rationale**: Workflows need access to loaded cerebrate definitions, command
dispatch, running cerebrate state, and the service/global log stream. Keeping them
in the service preserves the existing thin CLI and SDK-only control boundary.

**Alternatives considered**:

- **CLI-owned workflow loop**: Rejected because it would duplicate service logic and
  would not be visible to SDK, UI, or MCP consumers.
- **SDK-owned workflow loop**: Rejected because the SDK would need to read config and
  manage runtime state outside the service.

## R2: Branch condition model

**Decision**: Support a small deterministic condition model: `outputContains`,
`outputRegex`, and `statusEquals`. Multiple fields in one branch are combined with
AND semantics. Branches are evaluated in config order.

**Rationale**: This provides useful branching without introducing a scripting
language, expression parser, or unsafe evaluation context.

**Alternatives considered**:

- **Arbitrary JavaScript expressions**: Rejected due to safety, validation, and
  reproducibility concerns.
- **Only command status branching**: Rejected because users need to route on command
  output content.

## R3: Default transition and branch precedence

**Decision**: `next` is always the default successful transition. `branches[]` can
override it only when a branch matches. If multiple branches match, the first branch
in config order wins.

**Rationale**: The state remains readable and deterministic: a default path is always
present, and branches are explicit overrides.

## R4: Error handling model

**Decision**: `onError` is an optional state-level transition target used only after
command failure. If absent, the workflow becomes `failed` and no more commands are
invoked.

**Rationale**: This handles recoverable failures without hiding unrecoverable ones.
It also keeps failure semantics local to the state that can recover.

**Alternatives considered**:

- **Global workflow error handler**: Deferred until there is a clear need.
- **Automatic retry**: Rejected for this feature because retry policy requires more
  controls than the current spec defines.

## R5: Execution response timing

**Decision**: `startCerebrateWorkflow` returns after the workflow run is registered
and initial state is known. The workflow continues in the service and progress is
observed through logs.

**Rationale**: Some state commands may be long-running. Holding the IPC call open
for the full workflow would make the API brittle and duplicate attach semantics.

## R6: Transition logging

**Decision**: Every default, branch, error, failure, and completion transition is
logged to the service/global Overmind log stream.

**Rationale**: Unnamed `attach` is already the global log observation path. Workflow
progress should be visible through the same mechanism without requiring a new UI.
