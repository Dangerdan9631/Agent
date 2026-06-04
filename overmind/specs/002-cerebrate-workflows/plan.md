# Implementation Plan: Cerebrate Workflows

**Branch**: `002-cerebrate-workflows` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-cerebrate-workflows/spec.md`

## Summary

Add config-defined cerebrate workflows to the canonical Overmind workspace.
Workflows are service-owned state machines loaded from `cerebrate-config.yaml`.
Each state invokes an existing cerebrate command, evaluates ordered branches on
successful command output, follows `onError` on command failure when configured,
and logs every transition to the service/global Overmind log stream.

The implementation extends the existing three-package control surface:
`overmind-sdk` owns contracts, `packages/overmind` owns config loading and runtime
execution, and `packages/overmind-cli` remains a thin SDK caller.

## Technical Context

**Language/Version**: TypeScript on Node.js 24+ (ESM)

**Primary Dependencies**: commander, chalk, tsyringe, kkrpc, robot3, zod, yaml

**Storage**: File-based cerebrate config under
`cerebrates/<name>/cerebrate-config.yaml`; workflow runs are in-memory service
state for this feature

**Testing**: Vitest unit tests plus IPC/CLI integration tests from `overmind/src`

**Target Platform**: Local developer machines using the existing Windows named pipe
and Unix socket IPC paths

**Project Type**: CLI + detached service in the canonical npm workspace

**Performance Goals**: Workflow start should return within the existing local IPC
latency budget; state transitions should emit log output within one event loop turn
after command completion

**Constraints**: Three canonical packages only; CLI stays thin; service owns runtime
state; branch conditions remain deterministic and intentionally small; no parallel
workflow per cerebrate

**Scale/Scope**: Single service process, tens of cerebrates, one active workflow per
cerebrate

## Constitution Check

| Principle | Pre-design | Post-design |
|-----------|------------|-------------|
| I. Package boundaries | PASS — only `overmind`, `overmind-cli`, and `overmind-sdk` are modified | PASS |
| II. Thin CLI | PASS — CLI only parses `start-workflow` and delegates to SDK | PASS |
| III. Service + IPC | PASS — workflow state machine lives in service and is reached over IPC | PASS |
| IV. Contract-first config | PASS — request/response and config entities are specified before code | PASS |
| V. Tests | PASS — unit and integration tasks are required for config, runtime, SDK, and CLI | PASS |

No constitution violations are expected.

## Project Structure

### Documentation

```text
specs/002-cerebrate-workflows/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── cli-commands.md
    ├── ipc-service-api.md
    └── sdk-client-api.md
```

### Source Code

```text
overmind/src/
├── packages/
│   ├── overmind-sdk/
│   │   └── src/
│   │       ├── api/
│   │       ├── ipc/
│   │       └── operations/
│   ├── overmind/
│   │   └── src/
│   │       ├── application/
│   │       ├── domain/
│   │       ├── infrastructure/config/
│   │       └── service/
│   └── overmind-cli/
│       └── src/commands/
└── test/integration/
```

**Structure Decision**: Add workflow domain/use-case code to `packages/overmind`.
Add only cross-boundary types and client methods to `overmind-sdk`. Add only a
Commander command wrapper to `overmind-cli`.

## Phase 0: Research

Completed in [research.md](./research.md).

## Phase 1: Design

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| IPC contract | [contracts/ipc-service-api.md](./contracts/ipc-service-api.md) |
| SDK contract | [contracts/sdk-client-api.md](./contracts/sdk-client-api.md) |
| CLI contract | [contracts/cli-commands.md](./contracts/cli-commands.md) |
| Operator guide | [quickstart.md](./quickstart.md) |

## Implementation Roadmap

### Milestone W1 — Workflow config schema

**Goal**: Load and validate workflow state definitions from cerebrate config.

- Extend cerebrate config model with `states[]` and `workflows[]`
- Validate unique state/workflow names, reserved `END`, transition targets,
  branch targets, `onError`, and supported branch condition fields
- Add config-loader unit tests for valid and invalid workflow definitions

**Exit**: Invalid workflow config fails before cerebrate start or workflow execution.

### Milestone W2 — SDK and IPC contract expansion

**Goal**: Expose workflow start through the canonical SDK/IPC surface.

- Add `StartCerebrateWorkflowRequest` and `StartCerebrateWorkflowResponse`
- Extend `OvermindApi`, `OvermindIpcApi`, and `OvermindIpcClient`
- Implement SDK handler delegation to IPC
- Add focused SDK and IPC unit/contract tests

**Exit**: SDK can call `startCerebrateWorkflow` against the service IPC contract.

### Milestone W3 — Service workflow runtime

**Goal**: Execute workflows in the service.

- Add workflow run domain model with `running`, `completed`, and `failed` status
- Add workflow execution use case
- Reuse the existing send-command path for each state command
- Evaluate branch conditions after successful command completion
- Follow default `next` when no branch matches
- Follow `onError` when configured after command failure
- Reject concurrent workflow starts per cerebrate

**Exit**: Unit tests prove command order, branch precedence, default transition,
error transition, failure without `onError`, and completion on `END`.

### Milestone W4 — CLI and integration coverage

**Goal**: Provide user-facing workflow start and end-to-end verification.

- Add `start-workflow <cerebrate> <workflow>` command that delegates to SDK
- Add integration tests for CLI and SDK workflow starts
- Verify unnamed `attach` receives default, branch, error, failed, and completion
  log entries
- Update README or quickstart only where needed for operator usage

**Exit**: Success criteria SC-001 through SC-009 are covered by tests or quickstart.

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Branch conditions become too expressive | Keep supported fields limited to `outputContains`, `outputRegex`, and `statusEquals` |
| Workflow execution duplicates send-command behavior | Implement workflow commands through the existing send-command use case or port |
| Long-running workflow blocks IPC response | Return workflow start after registration; execute subsequent states asynchronously in service |
| Error loops run indefinitely | Preserve explicit config semantics but log every transition; defer retry/loop controls to a later spec |
| Log assertions are flaky | Assert ordered substrings in the service/global attach stream rather than exact timestamps |

## Next Command

Run **`/speckit-tasks`** to generate implementation tasks from W1-W4.

## Implementation Notes

- `startCerebrateWorkflow` now returns after workflow registration and executes the state machine asynchronously in the service.
- The current service implementation reuses `SendCerebrateCommandUseCase` for state command dispatch and emits workflow transition logs onto the global output sink.
- One active workflow per cerebrate is enforced by `CerebrateRegistry`.
- Integration coverage now verifies both SDK and CLI workflow start paths plus unnamed attach visibility of workflow completion logs.
