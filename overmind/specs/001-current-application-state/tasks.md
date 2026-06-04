---
description: "Task list for 001-current-application-state"
---

# Tasks: Overmind Current Application State (Baseline)

**Input**: Design documents from `/specs/001-current-application-state/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per plan milestones M0-M4 and constitution Principle V (Vitest unit + integration).

**Organization**: Tasks grouped by user story (P1 -> P2 -> P3). Foundational work (M1-M2) blocks cerebrate and SDK stories only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no incomplete dependencies)
- **[Story]**: US1-US5 mapping to spec.md user stories

## Path Conventions

- Workspace root: `overmind/src/`
- Canonical packages: `packages/overmind-sdk/`, `packages/overmind/`, `packages/overmind-cli/`
- Legacy reference only: `packages/service/`, `packages/api/`, `packages/cli/`, `packages/core/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test harness and workspace readiness for migration work

- [X] T001 Confirm `build`, `test`, and `lint` workspace scripts in `src/package.json` support the canonical packages only
- [X] T002 [P] Add or align integration test config in `src/vitest.integration.config.ts`
- [X] T003 [P] Create shared integration helpers for config-dir setup and CLI/service spawn in `src/test/integration/helpers/`

---

## Phase 2: Foundational (Blocking Prerequisites for US3-US4)

**Purpose**: Config bootstrap and IPC contract expansion required before cerebrate runtime and SDK completion

**CRITICAL**: User Stories 3 and 4 MUST NOT start until this phase is complete. US1 and US2 may proceed after Phase 1.

- [X] T004 Port Overmind config loader into `src/packages/overmind/src/infrastructure/config/overmind-config-loader.ts` from legacy service code without legacy imports
- [X] T005 [P] Port and extend cerebrate config loader in `src/packages/overmind/src/infrastructure/config/cerebrate-config-loader.ts` to preserve legacy command definitions including `run`, `shutdown`, and `attach`
- [X] T006 Invoke config bootstrap on service boot in `src/packages/overmind/src/service/overmind-service.ts` to create `overmind-config.yaml` and example cerebrate config when missing
- [X] T007 [P] Add config loader unit tests in `src/packages/overmind/test/unit/overmind-config-loader.test.ts` and `src/packages/overmind/test/unit/cerebrate-config-loader.test.ts`
- [X] T008 Extend `OvermindIpcApi` in `src/packages/overmind-sdk/src/ipc/overmind-ipc-api.ts` per `specs/001-current-application-state/contracts/ipc-service-api.md`
- [X] T009 [P] Extend `OvermindIpcClient` in `src/packages/overmind-sdk/src/ipc/overmind-ipc-client.ts` with `startCerebrate`, `stopCerebrate`, `sendCerebrateCommand`, `attach`, and `terminateAttach`
- [X] T010 Create `src/packages/overmind/src/service/overmind-connection-handler.ts` with stub handlers for the expanded IPC surface
- [X] T011 Wire config loaders and connection handler in `src/packages/overmind/src/di/container.ts`
- [X] T012 [P] Add IPC contract smoke coverage in `src/test/integration/ipc-contract.test.ts` for the expanded method set, including unnamed `attach`

**Checkpoint**: Config tree bootstraps on service start and the SDK/service IPC surface matches the documented contracts.

---

## Phase 3: User Story 1 - Start and observe the service (Priority: P1) 🎯 MVP

**Goal**: Reliable detached service start, stats display, and duplicate-start protection

**Independent Test**: `overmind start --config-dir <path>` then `overmind stats` shows uptime greater than zero, and a second `start` fails with a clear "already running" error

### Tests for User Story 1

- [X] T013 [P] [US1] Add `StartOperation` unit coverage in `src/packages/overmind-sdk/test/unit/start.test.ts`
- [X] T014 [P] [US1] Add `OvermindService.getStats` unit coverage in `src/packages/overmind/test/unit/overmind-service.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Add duplicate-start detection in `src/packages/overmind-sdk/src/operations/start.ts`
- [X] T016 [US1] Add start-to-stats integration coverage in `src/test/integration/service-lifecycle.test.ts`
- [X] T017 [US1] Update startup behavior notes in `specs/001-current-application-state/quickstart.md`
- [X] T018 [US1] Align service bootstrap guidance in `README.md`

**Checkpoint**: SC-001 satisfied; FR-001, FR-006, FR-009, and FR-010 verified.

---

## Phase 4: User Story 2 - Shut down the service safely (Priority: P1)

**Goal**: Cooperative and force shutdown with clear failure behavior when the service is absent or stale

**Independent Test**: After `start`, `shutdown` succeeds and `stats` fails; `shutdown --force` recovers a stale process without IPC

### Tests for User Story 2

- [X] T019 [P] [US2] Add `ShutdownOperation` unit coverage in `src/packages/overmind-sdk/test/unit/shutdown.test.ts`
- [X] T020 [P] [US2] Add `OvermindIpcClient.shutdown` coverage in `src/packages/overmind-sdk/test/unit/overmind-ipc-client.test.ts`

### Implementation for User Story 2

- [X] T021 [US2] Improve cooperative shutdown error handling in `src/packages/overmind-sdk/src/operations/shutdown.ts`
- [X] T022 [US2] Extend shutdown lifecycle integration coverage in `src/test/integration/service-lifecycle.test.ts`
- [X] T023 [US2] Validate and document the `shutdown --force` flow in `specs/001-current-application-state/quickstart.md`

**Checkpoint**: SC-002 satisfied; FR-007 and FR-008 verified; US1 and US2 form the MVP.

---

## Phase 5: User Story 3 - Control cerebrates via CLI (Priority: P2)

**Goal**: End-to-end cerebrate start, stop, send, and attach with live stats and legacy-compatible attach behavior

**Independent Test**: Run the quickstart cerebrate flow; all cerebrate CLI commands succeed, `stats` lists the running cerebrate, named `attach` follows cerebrate output, and unnamed `attach` follows service/global logs

### Tests for User Story 3

- [X] T024 [P] [US3] Add duplicate-name registry tests in `src/packages/overmind/test/unit/cerebrate-registry.test.ts`
- [X] T025 [P] [US3] Add named and unnamed attach unit coverage in `src/packages/overmind/test/unit/attach-to-output.test.ts`
- [X] T026 [US3] Add cerebrate lifecycle integration coverage in `src/test/integration/cerebrate-lifecycle.test.ts`

### Implementation for User Story 3

- [X] T027 [US3] Port the robot3 cerebrate runtime to `src/packages/overmind/src/domain/cerebrate/cerebrate.ts`
- [X] T028 [P] [US3] Port cerebrate registry logic to `src/packages/overmind/src/domain/cerebrate/cerebrate-registry.ts`
- [X] T029 [P] [US3] Port cerebrate definition and command models to `src/packages/overmind/src/domain/cerebrate/cerebrate-definition.ts` and `src/packages/overmind/src/domain/cerebrate/cerebrate-command.ts`
- [X] T030 [P] [US3] Port file-system task persistence to `src/packages/overmind/src/infrastructure/persistence/file-system-task-repository.ts`
- [X] T031 [US3] Port `StartCerebrateUseCase` to `src/packages/overmind/src/application/use-cases/start-cerebrate.ts`
- [X] T032 [P] [US3] Port `StopCerebrateUseCase` to `src/packages/overmind/src/application/use-cases/stop-cerebrate.ts`
- [X] T033 [P] [US3] Port `SendCerebrateCommandUseCase` to `src/packages/overmind/src/application/use-cases/send-cerebrate-command.ts` and preserve legacy `run`/`shutdown`/`attach` command handling
- [X] T034 [US3] Port `AttachToOutputUseCase` to `src/packages/overmind/src/application/use-cases/attach-to-output.ts` with legacy unnamed/global-buffer semantics
- [X] T035 [US3] Implement named and unnamed attach streaming in `src/packages/overmind/src/service/overmind-connection-handler.ts`
- [X] T036 [US3] Wire cerebrate use cases and live `cerebrates[]` stats in `src/packages/overmind/src/service/overmind-service.ts`
- [X] T037 [US3] Audit CLI delegation only in `src/packages/overmind-cli/src/commands/*.ts` and keep business logic out of the CLI

**Checkpoint**: FR-012, FR-014, FR-015, and FR-017 satisfied at the service layer; CLI behavior is ready for SDK completion.

---

## Phase 6: User Story 4 - Programmatic control via SDK (Priority: P2)

**Goal**: Remove all `Method not implemented` stubs from `OvermindApiHandler`

**Independent Test**: `OvermindApiFactory.create(configDir)` exercises every method successfully against a running service, including unnamed `attach`

### Tests for User Story 4

- [X] T038 [US4] Add end-to-end SDK integration coverage in `src/packages/overmind-sdk/test/integration/overmind-api-handler.test.ts`

### Implementation for User Story 4

- [X] T039 [US4] Implement `startCerebrate` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts`
- [X] T040 [P] [US4] Implement `stopCerebrate` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts`
- [X] T041 [P] [US4] Implement `sendCerebrateCommand` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts`
- [X] T042 [US4] Create attach channel adapter in `src/packages/overmind-sdk/src/ipc/attach-channel-adapter.ts`
- [X] T043 [US4] Implement `attach` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts` and preserve optional `name` passthrough for service/global log attach
- [X] T044 [US4] Export the attach adapter from `src/packages/overmind-sdk/src/ipc/index.ts`
- [X] T045 [US4] Verify all seven CLI commands and update the status matrix in `specs/001-current-application-state/spec.md` and `specs/001-current-application-state/contracts/cli-commands.md`

**Checkpoint**: SC-003 satisfied; FR-011 and FR-013 verified; US3 and US4 complete the canonical control surface.

---

## Phase 7: User Story 5 - Planned multi-surface architecture (Priority: P3)

**Goal**: Document the north-star architecture without implementing UI or MCP surfaces

**Independent Test**: A reader can identify deferred surfaces and out-of-scope boundaries directly from the spec set

- [X] T046 [US5] Add or refine the deferred product surfaces section in `specs/001-current-application-state/spec.md` for UI, MCP, and provider integrations
- [X] T047 [US5] Confirm `AGENTS.md` points to `specs/001-current-application-state/plan.md`, `specs/001-current-application-state/quickstart.md`, and `.specify/memory/constitution.md`

**Checkpoint**: FR-018 through FR-021 remain documented and explicitly out of scope for implementation.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final migration cleanup and canonical workspace enforcement

- [X] T048 Remove legacy workspace entries from `src/package.json`
- [X] T049 [P] Remove legacy path mappings from `src/tsconfig.base.json`
- [X] T050 Delete legacy directories `src/packages/api/`, `src/packages/cli/`, `src/packages/core/`, and `src/packages/service/`
- [X] T051 Run `npm run build` and `npm test` from `src/` and fix resulting canonical-package breakages
- [X] T052 [P] Finalize post-migration documentation in `README.md` and `specs/001-current-application-state/quickstart.md`
- [X] T053 Search the repo for legacy package imports and remove or document any remaining exceptions in `specs/001-current-application-state/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies
- **Phase 2**: Depends on Phase 1 and blocks US3 and US4
- **US1** and **US2**: Depend on Phase 1 and can run before Phase 2 completes
- **US3**: Depends on Phase 2
- **US4**: Depends on US3
- **US5**: Independent once the spec set exists
- **Phase 8**: Depends on US4 and the decision to remove legacy packages

### User Story Dependencies

- **US1**: Depends on Phase 1 only
- **US2**: Depends on Phase 1 only
- **US3**: Depends on Phase 2
- **US4**: Depends on US3
- **US5**: No implementation dependency on other stories

### Within Each User Story

- Tests should be written to fail before implementation when introducing new behavior
- Domain/runtime work precedes use cases
- Use cases precede IPC handlers
- IPC handlers precede SDK handlers
- SDK handlers precede final CLI verification

### Parallel Opportunities

- **Phase 1**: T002 and T003
- **Phase 2**: T005, T007, T009, and T012 after initial loader/contract direction is set
- **US1**: T013 and T014
- **US2**: T019 and T020
- **US3**: T024 and T025; later T028, T029, T030, T032, and T033 after T027
- **US4**: T040 and T041 after T039
- **Phase 8**: T049 and T052

---

## Parallel Example: User Story 3

```bash
# After T027 establishes the runtime model, parallelize:
# T028 Port cerebrate registry
# T029 Port cerebrate definition and command models
# T030 Port file-system task persistence
# T032 Port StopCerebrateUseCase
# T033 Port SendCerebrateCommandUseCase
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1
2. Complete US1 and US2
3. Validate `quickstart.md` steps 1-5
4. Stop and demo the service lifecycle MVP before beginning cerebrate work

### Incremental Delivery

1. Setup -> US1 -> US2 for the service lifecycle MVP
2. Foundational -> US3 -> US4 for the full canonical CLI and SDK surface
3. US5 documentation updates anytime after the spec set is stable
4. Phase 8 only after canonical behavior is complete and legacy removal is approved

### Suggested MVP Scope

Phases 1, 3, and 4 only: T001-T003 and T013-T023.

---

## Notes

- Unnamed `attach` is part of the required behavior and must continue to target the service/global log buffer
- Legacy packages are migration sources only until Phase 8
- The kkrpc attach design is the main risk area for US3 and US4; use the legacy attach flow as the behavioral reference
