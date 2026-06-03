---
description: "Task list for 001-current-application-state"
---

# Tasks: Overmind Current Application State (Baseline)

**Input**: Design documents from `/specs/001-current-application-state/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per plan milestones M0–M4 and constitution Principle V (Vitest unit + integration).

**Organization**: Tasks grouped by user story (P1 → P2 → P3). Foundational work (M1–M2) blocks cerebrate/SDK stories only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no incomplete dependencies)
- **[Story]**: US1–US5 mapping to spec.md user stories

## Path Conventions

- Workspace root: `overmind/src/`
- Canonical packages: `packages/overmind-sdk/`, `packages/overmind/`, `packages/overmind-cli/`
- Legacy reference (read-only until M5): `packages/service/`, `packages/api/`, `packages/cli/`, `packages/core/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test harness and workspace readiness for migration work

- [x] T001 Confirm `npm run build`, `npm test`, and `npm run lint` scripts in `src/package.json`
- [x] T002 [P] Add Vitest integration config at `src/vitest.integration.config.ts` (or extend existing config pattern)
- [x] T003 [P] Create integration test directory `src/test/integration/` with shared helpers for config dir + CLI spawn

---

## Phase 2: Foundational (Blocking Prerequisites for US3–US4)

**Purpose**: Config bootstrap and expanded IPC contracts required before cerebrate runtime and SDK completion

**⚠️ CRITICAL**: User Stories 3 and 4 MUST NOT start until this phase is complete. US1/US2 may proceed after Phase 1.

- [ ] T004 Port `overmind-config-loader` into `src/packages/overmind/src/infrastructure/config/overmind-config-loader.ts` (adapt from `src/packages/service/src/infrastructure/config/`, no legacy imports)
- [ ] T005 [P] Port `cerebrate-config-loader` into `src/packages/overmind/src/infrastructure/config/cerebrate-config-loader.ts`
- [ ] T006 Invoke config bootstrap on service boot in `src/packages/overmind/src/service/overmind-service.ts` (create `overmind-config.yaml` and `cerebrates/hello/cerebrate-config.yaml` when missing)
- [ ] T007 Extend `OvermindIpcApi` in `src/packages/overmind-sdk/src/ipc/overmind-ipc-api.ts` per `specs/001-current-application-state/contracts/ipc-service-api.md`
- [ ] T008 [P] Create `src/packages/overmind/src/service/overmind-connection-handler.ts` with stub handlers for `startCerebrate`, `stopCerebrate`, `sendCerebrateCommand`, and `attach`
- [ ] T009 Extend `OvermindIpcClient` in `src/packages/overmind-sdk/src/ipc/overmind-ipc-client.ts` with client methods for new IPC operations
- [ ] T010 Wire connection handler and config loaders in `src/packages/overmind/src/di/container.ts`
- [ ] T011 [P] Add IPC contract smoke test in `src/test/integration/ipc-contract.test.ts` (methods callable; may error until US3)

**Checkpoint**: Config tree bootstraps on service start; IPC surface matches contracts; US3/US4 unblocked

---

## Phase 3: User Story 1 - Start and observe the service (Priority: P1) 🎯 MVP

**Goal**: Reliable detached service start, stats display, and duplicate-start protection

**Independent Test**: `overmind start --config-dir <path>` then `overmind stats` shows uptime > 0; second `start` fails clearly

### Tests for User Story 1

- [x] T012 [P] [US1] Add unit tests for `StartOperation` in `src/packages/overmind-sdk/test/unit/start.test.ts`
- [x] T013 [P] [US1] Add unit tests for `OvermindService.getStats` in `src/packages/overmind/test/unit/overmind-service.test.ts`

### Implementation for User Story 1

- [x] T014 [US1] Add duplicate-start guard in `src/packages/overmind-sdk/src/operations/start.ts` (IPC reachable → error, no second spawn)
- [x] T015 [US1] Add integration test start→stats in `src/test/integration/service-lifecycle.test.ts`
- [x] T016 [US1] Update `specs/001-current-application-state/quickstart.md` steps 1–3 for M1 config bootstrap behavior
- [x] T017 [US1] Align `README.md` config section with bootstrap implementation status

**Checkpoint**: SC-001 satisfied; FR-001, FR-006, FR-009, FR-010 verified

---

## Phase 4: User Story 2 - Shut down the service safely (Priority: P1)

**Goal**: Cooperative and force shutdown with clear errors when service is absent

**Independent Test**: After `start`, `shutdown` succeeds; `stats` fails; `shutdown --force` recovers stale processes

### Tests for User Story 2

- [x] T018 [P] [US2] Add unit tests for `ShutdownOperation` in `src/packages/overmind-sdk/test/unit/shutdown.test.ts`
- [x] T019 [P] [US2] Add unit tests for `OvermindIpcClient` in `src/packages/overmind-sdk/test/unit/overmind-ipc-client.test.ts`

### Implementation for User Story 2

- [x] T020 [US2] Improve cooperative shutdown error messages in `src/packages/overmind-sdk/src/operations/shutdown.ts` when IPC unavailable
- [x] T021 [US2] Extend `src/test/integration/service-lifecycle.test.ts` with shutdown and post-shutdown connection failure cases
- [ ] T022 [US2] Validate `shutdown --force` flow documented in `specs/001-current-application-state/quickstart.md` step 5

**Checkpoint**: SC-002 satisfied; FR-007, FR-008 verified; US1+US2 form MVP

---

## Phase 5: User Story 3 - Control cerebrates via CLI (Priority: P2)

**Goal**: End-to-end cerebrate start/stop/send/attach with live stats (port legacy runtime into `packages/overmind`)

**Independent Test**: Run quickstart cerebrate section (plan M3–M4); all four cerebrate CLI commands succeed; `stats` lists running cerebrate

### Tests for User Story 3

- [ ] T023 [P] [US3] Add unit tests for `CerebrateRegistry` duplicate-name enforcement in `src/packages/overmind/test/unit/cerebrate-registry.test.ts`
- [ ] T024 [US3] Add integration test cerebrate lifecycle in `src/test/integration/cerebrate-lifecycle.test.ts`

### Implementation for User Story 3

- [ ] T025 [US3] Port `Cerebrate` robot3 machine to `src/packages/overmind/src/domain/cerebrate/cerebrate.ts` (imports from `overmind-sdk` only)
- [ ] T026 [P] [US3] Port cerebrate registry to `src/packages/overmind/src/domain/cerebrate/cerebrate-registry.ts`
- [ ] T027 [P] [US3] Port task repository to `src/packages/overmind/src/infrastructure/persistence/file-system-task-repository.ts` and related parser/formatter files
- [ ] T028 [US3] Port `StartCerebrateUseCase` to `src/packages/overmind/src/application/use-cases/start-cerebrate.ts`
- [ ] T029 [P] [US3] Port `StopCerebrateUseCase` to `src/packages/overmind/src/application/use-cases/stop-cerebrate.ts`
- [ ] T030 [P] [US3] Port `SendCerebrateCommandUseCase` to `src/packages/overmind/src/application/use-cases/send-cerebrate-command.ts`
- [ ] T031 [US3] Port `AttachToOutputUseCase` to `src/packages/overmind/src/application/use-cases/attach-to-output.ts`
- [ ] T032 [US3] Implement kkrpc attach streaming in `src/packages/overmind/src/service/overmind-connection-handler.ts` per `specs/001-current-application-state/research.md`
- [ ] T033 [US3] Wire use cases and populate `GetStatsResponse.cerebrates` in `src/packages/overmind/src/service/overmind-service.ts`
- [ ] T034 [US3] Audit `src/packages/overmind-cli/src/commands/*.ts` — confirm no business logic added (thin delegation only)

**Checkpoint**: FR-012, FR-014, FR-016 satisfied at service layer; cerebrate CLI commands work once US4 completes

---

## Phase 6: User Story 4 - Programmatic control via SDK (Priority: P2)

**Goal**: Remove all `Method not implemented` stubs from `OvermindApiHandler`

**Independent Test**: `OvermindApiFactory.create(dir)` exercises every method successfully against running service

### Tests for User Story 4

- [ ] T035 [US4] Add SDK integration tests in `src/packages/overmind-sdk/test/integration/overmind-api-handler.test.ts`

### Implementation for User Story 4

- [ ] T036 [US4] Implement `startCerebrate` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts` via `OvermindIpcClient`
- [ ] T037 [P] [US4] Implement `stopCerebrate` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts`
- [ ] T038 [P] [US4] Implement `sendCerebrateCommand` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts`
- [ ] T039 [US4] Create attach channel adapter in `src/packages/overmind-sdk/src/ipc/attach-channel-adapter.ts` matching `AttachChannel` in `src/packages/overmind-sdk/src/api/attach.ts`
- [ ] T040 [US4] Implement `attach` in `src/packages/overmind-sdk/src/operations/overmind-api-handler.ts` using attach adapter
- [ ] T041 [US4] Export attach adapter from `src/packages/overmind-sdk/src/ipc/index.ts` if needed by consumers
- [ ] T042 [US4] Verify all seven commands against `specs/001-current-application-state/contracts/cli-commands.md` (update matrix in `spec.md` if status changes)

**Checkpoint**: SC-003 inverted (all commands work); FR-011, FR-013 satisfied; US3+US4 complete

---

## Phase 7: User Story 5 - Planned multi-surface architecture (Priority: P3)

**Goal**: Document north-star architecture without implementing UI/MCP

**Independent Test**: Spec reader can list deferred surfaces and constitution constraints without reading TEMP.md

- [ ] T043 [US5] Add "Deferred product surfaces" subsection to `specs/001-current-application-state/spec.md` referencing TEMP.md (UI, MCP, agent providers) with explicit out-of-scope boundary
- [ ] T044 [US5] Confirm `AGENTS.md` links plan, quickstart, and constitution per Spec Kit agent context rules

**Checkpoint**: FR-017–FR-020 documented; no UI/MCP code introduced

---

## Phase 8: Polish & Cross-Cutting Concerns (M5 — Legacy removal)

**Purpose**: Constitution-compliant workspace; SC-005

- [ ] T045 Remove legacy workspace entries from `src/package.json` (`packages/api`, `cli`, `core`, `service`)
- [ ] T046 [P] Update path mappings in `src/tsconfig.base.json` to canonical packages only
- [ ] T047 Delete directories `src/packages/api/`, `src/packages/cli/`, `src/packages/core/`, `src/packages/service/`
- [ ] T048 Run `npm run build` and `npm test` from `src/` and fix any breakages in canonical packages
- [ ] T049 [P] Final pass on `README.md` and `specs/001-current-application-state/quickstart.md` for post-migration accuracy
- [ ] T050 Grep repo for legacy package imports; eliminate or document exceptions in `specs/001-current-application-state/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks US3 and US4 only**
- **US1 (Phase 3)** and **US2 (Phase 4)**: Depend on Setup; may run in parallel with Phase 2
- **US3 (Phase 5)**: Depends on Foundational completion
- **US4 (Phase 6)**: Depends on US3 (service handlers must exist)
- **US5 (Phase 7)**: Independent; may run anytime after spec exists
- **Polish (Phase 8)**: Depends on US4 completion (all canonical behavior migrated)

### User Story Dependencies

| Story | Depends on | Blocks |
|-------|------------|--------|
| US1 | Phase 1 | — |
| US2 | Phase 1 (US1 recommended first for shared integration test file) | — |
| US3 | Phase 2 | US4 |
| US4 | US3 | Phase 8 |
| US5 | — | — |

### Within Each User Story

- Tests written to fail before implementation where new behavior is added
- Domain → application use cases → service IPC → SDK handler → CLI verification
- Commit after each task or logical group

### Parallel Opportunities

- **Phase 1**: T002, T003 in parallel
- **Phase 2**: T005, T008, T011 in parallel after T004/T007 sequencing
- **US1**: T012, T013 in parallel
- **US2**: T018, T019 in parallel
- **US3**: T026, T027, T029, T030 in parallel after T025
- **US4**: T037, T038 in parallel after T036
- **Phase 8**: T046, T049 in parallel

---

## Parallel Example: User Story 3

```bash
# After T025 completes, launch in parallel:
# T026 Port cerebrate registry → packages/overmind/src/domain/cerebrate/cerebrate-registry.ts
# T027 Port task repository → packages/overmind/src/infrastructure/persistence/
# T029 Port StopCerebrateUseCase → packages/overmind/src/application/use-cases/stop-cerebrate.ts
# T030 Port SendCerebrateCommandUseCase → packages/overmind/src/application/use-cases/send-cerebrate-command.ts
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 3–4: US1 + US2 (skip Phase 2 for MVP)
3. **STOP and VALIDATE**: `quickstart.md` steps 1–5
4. Demo: local service control without cerebrates

### Incremental Delivery

1. Setup → US1 → US2 (**MVP**: service lifecycle)
2. Foundational → US3 → US4 (**Full CLI**: cerebrate control)
3. US5 (docs) anytime
4. Phase 8 (**Clean workspace**: remove legacy)

### Suggested MVP Scope

**Phases 1, 3, 4 only** (T001–T003, T012–T022) — 16 tasks — delivers FR-001–FR-010 and SC-001/SC-002.

---

## Notes

- Legacy `packages/service` is a **read-only** port source until T047; do not add features there
- Attach kkrpc spike is on critical path for T032; escalate per `research.md` if bidirectional RPC blocked
- npm package name `overmind-service` vs directory `overmind` is out of scope (see plan risks)
