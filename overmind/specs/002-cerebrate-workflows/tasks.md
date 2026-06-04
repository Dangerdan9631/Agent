---
description: "Task list for 002-cerebrate-workflows"
---

# Tasks: Cerebrate Workflows

**Input**: Design documents from `/specs/002-cerebrate-workflows/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per plan milestones W1-W4 and constitution Principle V (Vitest unit + integration).

**Organization**: Tasks grouped by user story (P1 -> P2). All implementation remains inside the canonical packages.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no incomplete dependencies)
- **[Story]**: US1-US5 mapping to spec.md user stories

## Path Conventions

- Workspace root: `overmind/src/`
- Service package: `packages/overmind/`
- SDK package: `packages/overmind-sdk/`
- CLI package: `packages/overmind-cli/`
- Integration tests: `test/integration/`

---

## Phase 1: Setup and Contract Skeleton

**Purpose**: Establish shared workflow types and test entry points before behavior work.

- [x] T001 [P] Add workflow API request/response models in `src/packages/overmind-sdk/src/api/start-cerebrate-workflow.ts`
- [x] T002 [P] Export workflow API models from `src/packages/overmind-sdk/src/api/index.ts`
- [x] T003 Extend `OvermindApi` in `src/packages/overmind-sdk/src/api/overmind-api.ts` with `startCerebrateWorkflow`
- [x] T004 Extend `OvermindIpcApi` in `src/packages/overmind-sdk/src/ipc/overmind-ipc-api.ts` with `startCerebrateWorkflow`
- [x] T005 [P] Add workflow fixture helpers for unit tests in `src/packages/overmind/test/unit/workflow-test-fixtures.ts`

**Checkpoint**: Cross-boundary workflow names and payloads exist in SDK contracts.

---

## Phase 2: User Story 1 - Define workflow states in cerebrate config (Priority: P1)

**Goal**: Load and validate `states[]`, ordered `branches[]`, `onError`, and `workflows[]` from cerebrate config.

**Independent Test**: Load valid and invalid cerebrate configs and verify workflow validation before execution.

### Tests for User Story 1

- [x] T006 [P] [US1] Add valid workflow config loader coverage in `src/packages/overmind/test/unit/cerebrate-config-loader.test.ts`
- [x] T007 [P] [US1] Add invalid state/workflow reference coverage in `src/packages/overmind/test/unit/cerebrate-config-loader.test.ts`
- [x] T008 [P] [US1] Add invalid branch condition and malformed regex coverage in `src/packages/overmind/test/unit/cerebrate-config-loader.test.ts`
- [x] T009 [P] [US1] Add reserved `END` state-name coverage in `src/packages/overmind/test/unit/cerebrate-config-loader.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Add workflow branch/domain config types in `src/packages/overmind/src/domain/cerebrate/cerebrate-definition.ts`
- [x] T011 [US1] Extend `CerebrateConfigLoader` schema in `src/packages/overmind/src/infrastructure/config/cerebrate-config-loader.ts` for `states[]`, `branches[]`, `onError`, and `workflows[]`
- [x] T012 [US1] Implement validation for unique state/workflow names and reserved `END` in `src/packages/overmind/src/infrastructure/config/cerebrate-config-loader.ts`
- [x] T013 [US1] Implement validation for `initialState`, `next`, branch target, and `onError` references in `src/packages/overmind/src/infrastructure/config/cerebrate-config-loader.ts`
- [x] T014 [US1] Implement validation for supported branch condition fields `outputContains`, `outputRegex`, and `statusEquals` in `src/packages/overmind/src/infrastructure/config/cerebrate-config-loader.ts`

**Checkpoint**: W1 complete; invalid workflow config fails before cerebrate start or workflow execution.

---

## Phase 3: User Story 2 - Start a workflow from CLI or SDK (Priority: P1)

**Goal**: Expose workflow start through SDK, IPC, service, and CLI without putting business logic in the CLI.

**Independent Test**: Start a workflow through SDK and CLI and verify the initial response shape.

### Tests for User Story 2

- [x] T015 [P] [US2] Add SDK handler delegation coverage in `src/packages/overmind-sdk/test/unit/overmind-api-handler.test.ts`
- [x] T016 [P] [US2] Add IPC client workflow delegation coverage in `src/packages/overmind-sdk/test/unit/overmind-ipc-client.test.ts`
- [x] T017 [P] [US2] Add connection-handler workflow delegation coverage in `src/packages/overmind/test/unit/overmind-connection-handler.test.ts`
- [x] T018 [P] [US2] Add CLI `start-workflow` delegation coverage in `src/packages/overmind-cli/test/unit/commands.test.ts`

### Implementation for User Story 2

- [x] T019 [US2] Implement `OvermindIpcClient.startCerebrateWorkflow` in `src/packages/overmind-sdk/src/ipc/overmind-ipc-client.ts`
- [x] T020 [US2] Implement `OvermindApiHandler.startCerebrateWorkflow` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts`
- [x] T021 [US2] Add service IPC handler delegation in `src/packages/overmind/src/service/overmind-connection-handler.ts`
- [x] T022 [US2] Add `OvermindService.startCerebrateWorkflow` shell in `src/packages/overmind/src/service/overmind-service.ts`
- [x] T023 [US2] Add CLI command `src/packages/overmind-cli/src/commands/start-workflow.ts`
- [x] T024 [US2] Register `StartWorkflowCommand` in `src/packages/overmind-cli/src/di/container.ts`
- [x] T025 [US2] Export `StartWorkflowCommand` from `src/packages/overmind-cli/src/commands/index.ts`

**Checkpoint**: W2 complete; SDK can call `startCerebrateWorkflow` through IPC and CLI delegates to SDK.

---

## Phase 4: User Story 3 - Execute workflow state transitions and branches (Priority: P1)

**Goal**: Run workflow state machines in the service, invoke existing commands, and apply deterministic branch/default transitions.

**Independent Test**: A workflow executes commands in selected order, chooses the first matching branch, follows default `next` when no branch matches, and completes on `END`.

### Tests for User Story 3

- [x] T026 [P] [US3] Add workflow run domain tests for initial state, running status, and completion in `src/packages/overmind/test/unit/workflow-run.test.ts`
- [x] T027 [P] [US3] Add branch condition evaluator tests for `outputContains`, `outputRegex`, `statusEquals`, AND semantics, and first-match precedence in `src/packages/overmind/test/unit/workflow-branch-evaluator.test.ts`
- [x] T028 [P] [US3] Add workflow executor tests for default transition and branch transition command order in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`
- [x] T029 [P] [US3] Add completion-on-`END` executor coverage in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Add workflow run domain model in `src/packages/overmind/src/domain/workflow/workflow-run.ts`
- [x] T031 [P] [US3] Add branch condition evaluator in `src/packages/overmind/src/domain/workflow/workflow-branch-evaluator.ts`
- [x] T032 [US3] Add start workflow use case in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T033 [US3] Reuse `SendCerebrateCommandUseCase` from workflow execution in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T034 [US3] Implement default transition handling and completion on `END` in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T035 [US3] Implement ordered branch evaluation and first-match branch selection in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T036 [US3] Track one active workflow per cerebrate in `src/packages/overmind/src/application/cerebrate-registry.ts`
- [x] T037 [US3] Wire `StartCerebrateWorkflowUseCase` into `src/packages/overmind/src/di/container.ts` and `src/packages/overmind/src/service/overmind-service.ts`

**Checkpoint**: W3 branch/default behavior complete; workflows execute in the service through existing command dispatch.

---

## Phase 5: User Story 4 - Handle workflow command errors (Priority: P1)

**Goal**: Follow configured `onError` transitions or fail workflows deterministically when state commands fail.

**Independent Test**: A failing state follows `onError` when present and fails the workflow when absent.

### Tests for User Story 4

- [x] T038 [P] [US4] Add `onError` transition coverage in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`
- [x] T039 [P] [US4] Add failure-without-`onError` coverage in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`
- [x] T040 [P] [US4] Add `onError: END` completion coverage in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`
- [x] T041 [P] [US4] Add active workflow rejection coverage in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`

### Implementation for User Story 4

- [x] T042 [US4] Implement command failure detection in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T043 [US4] Implement `onError` transition handling including `END` target in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T044 [US4] Implement workflow `failed` status and `lastError` tracking in `src/packages/overmind/src/domain/workflow/workflow-run.ts`
- [x] T045 [US4] Reject concurrent workflow starts for the same cerebrate in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`

**Checkpoint**: Error handling complete; failed and recovered workflows behave according to spec.

---

## Phase 6: User Story 5 - Observe workflow progress in Overmind logs (Priority: P2)

**Goal**: Emit default, branch, error, failure, and completion transition entries to the service/global log stream and verify unnamed attach sees them.

**Independent Test**: Start workflows while unnamed attach is active and assert transition/error/completion log entries are emitted.

### Tests for User Story 5

- [x] T046 [P] [US5] Add workflow transition log unit coverage in `src/packages/overmind/test/unit/start-cerebrate-workflow.test.ts`
- [x] T047 [US5] Add SDK workflow integration coverage in `src/packages/overmind-sdk/test/integration/overmind-api-handler.test.ts`
- [x] T048 [US5] Add CLI workflow integration coverage in `src/test/integration/cerebrate-workflow.test.ts`
- [x] T049 [US5] Add unnamed attach workflow log integration coverage in `src/test/integration/cerebrate-workflow.test.ts`

### Implementation for User Story 5

- [x] T050 [US5] Write workflow transition log entries through the service/global output sink in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T051 [US5] Ensure default, branch, error, failure, and completion transition types are included in workflow log messages in `src/packages/overmind/src/application/use-cases/start-cerebrate-workflow.ts`
- [x] T052 [US5] Update `specs/002-cerebrate-workflows/quickstart.md` with any final command output details discovered during implementation

**Checkpoint**: W4 complete; unnamed attach observes workflow progress and all success criteria are covered.

---

## Phase 7: Polish and Verification

**Purpose**: Final consistency and full workspace verification.

- [x] T053 Run `npm run build` from `src/` and fix workflow-related build failures
- [x] T054 Run `npm test` from `src/` and fix workflow-related test failures
- [x] T055 Run `npm run lint` from `src/` and fix workflow-related lint failures
- [x] T056 Search for `startCerebrateWorkflow`, `start-workflow`, `states[].branches[]`, and `onError` references and confirm contracts, docs, and implementation names are consistent
- [x] T057 Update `specs/002-cerebrate-workflows/plan.md` with any implementation notes needed after verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies
- **US1**: Depends on Phase 1 and blocks runtime execution
- **US2**: Depends on Phase 1; can run in parallel with US1 after API type names are settled
- **US3**: Depends on US1 and US2
- **US4**: Depends on US3
- **US5**: Depends on US3 and US4
- **Polish**: Depends on US1-US5

### User Story Dependencies

- **US1**: Independent config validation story
- **US2**: Independent control-surface story after contract skeleton
- **US3**: Requires config validation and workflow start control surface
- **US4**: Requires workflow executor
- **US5**: Requires executor and error handling so all transition types can be logged

### Parallel Opportunities

- **Phase 1**: T001, T002, and T005
- **US1**: T006-T009 in parallel before T010-T014
- **US2**: T015-T018 in parallel before T019-T025
- **US3**: T026-T029 in parallel; T030 and T031 can proceed together
- **US4**: T038-T041 in parallel before T042-T045
- **US5**: T046 can proceed before integration tests; T047-T049 can be split after runtime logging is implemented

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 contract skeleton
2. Complete US1 config validation
3. Complete US2 SDK/IPC/CLI start operation
4. Complete US3 default and branch execution
5. Validate SC-001 through SC-004 before adding error handling

### Incremental Delivery

1. Config schema and validation
2. Workflow start API through SDK/IPC/CLI
3. Service workflow execution with branch/default transitions
4. Error handling and active-workflow rejection
5. Global log-stream observability and integration coverage

### Suggested First Implementation Slice

Tasks T001-T014: workflow type definitions plus config validation. This slice is independently useful because it prevents invalid workflow definitions from reaching runtime execution.

---

## Notes

- `next` remains the default success transition even when `branches[]` is present
- Branches are evaluated only after successful command completion
- `onError` is evaluated only after command failure
- `END` is reserved and may only appear as a transition target
- CLI must stay a parser/formatter around SDK calls
