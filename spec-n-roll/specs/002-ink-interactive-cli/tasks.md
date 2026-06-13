---

description: "Task list for Interactive Ink CLI Application implementation"
---

# Tasks: Interactive Ink CLI Application

**Input**: Design documents from `specs/002-ink-interactive-cli/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | research.md ✅ | quickstart.md ✅ | contracts/ ✅

**Tests**: Included — plan.md requires `ink-testing-library` navigation tests and byte-equivalence parity integration tests (SC-003, SC-006); base toolkit TDD discipline applies.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Format**: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1–US4); omitted for Setup, Foundational, and Polish phases
- Exact source file paths per `src/` structure in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add interactive-layer dependencies and directory skeleton before shell implementation.

- [ ] T001 Add `ink-testing-library` dev dependency in package.json for Ink screen tests
- [ ] T002 Create interactive directory skeleton per plan.md: `src/cli/ink/app/`, `src/cli/ink/components/`, `src/cli/ink/screens/` (with `specs/`, `workflows/`, `agents/`, `project/`, `setup/` subdirs), `src/cli/ink/read-models/`, `src/cli/interactive/`, `tests/unit/interactive/`, `tests/unit/interactive/screens/`
- [ ] T003 [P] Update `src/cli/ink/README.md` to describe app shell, screens, read-models, and reuse of existing prompt modules
- [ ] T004 [P] Add multi-spec interactive fixture project in `tests/fixtures/interactive-multi-spec/` (initialized project with 2+ task specs, mixed lifecycle statuses, one unrecognized `specs/` directory)

**Checkpoint**: `npm install` succeeds; directory skeleton exists; fixture layout documented in fixture README if needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Application shell, bare-invocation routing, shared components, and navigation primitives that MUST be complete before user story screens.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Define `RouteId` union, navigation stack helpers, and breadcrumb titles in `src/cli/ink/app/navigation.ts` per `data-model.md`
- [ ] T006 Implement `SessionContext` provider (projectRoot, isInitialized, navigationStack, selectedTaskSpec, binaryContext) in `src/cli/ink/app/session-context.tsx`
- [ ] T007 [P] Implement `SelectableList` keyboard list with focus indicator in `src/cli/ink/components/SelectableList.tsx`
- [ ] T008 [P] Implement `StatusBar` footer (project root, binary context, breadcrumb) in `src/cli/ink/components/StatusBar.tsx`
- [ ] T009 [P] Implement `ErrorBanner` inline recoverable error display in `src/cli/ink/components/ErrorBanner.tsx`
- [ ] T010 [P] Implement `ConfirmDialog` reusable confirmation gate in `src/cli/ink/components/ConfirmDialog.tsx`
- [ ] T011 [P] Implement `NumberedSelectionPrompt` for multi Active task spec pick in `src/cli/ink/components/NumberedSelectionPrompt.tsx` (FR-011)
- [ ] T012 Implement `App.tsx` shell with route rendering, global `q`/`Esc`/`b`/`?` key handling in `src/cli/ink/app/App.tsx` per `contracts/interactive-app.md`
- [ ] T013 Implement `main-menu.tsx` with five top-level sections and uninitialized guided state in `src/cli/ink/screens/main-menu.tsx` (SC-005)
- [ ] T014 Implement `launchInteractiveApp()` with project root resolution and Ink render lifecycle in `src/cli/interactive/launch.ts`
- [ ] T015 Implement bare-invocation detection and branch to `launchInteractiveApp()` in `src/cli/index.ts` (FR-001, FR-002; subcommands unchanged)
- [ ] T016 [P] Implement `resolveTaskSpecForMutation()` selection helper (session context → single Active auto-select → numbered prompt → error) in `src/cli/ink/read-models/task-spec-selection.ts`
- [ ] T017 [P] Write failing unit tests for navigation stack push/pop and route titles in `tests/unit/interactive/navigation.test.ts`
- [ ] T018 [P] Write failing integration test that bare `spec-n-roll` launches Ink and `spec-n-roll init --help` stays non-interactive in `tests/integration/interactive-launch.test.ts`

**Checkpoint**: Bare `spec-n-roll` opens main menu; `spec-n-roll version` and subcommands exit non-interactively; T017–T018 exist and fail until screens land.

---

## Phase 3: User Story 1 — Browse and Inspect Toolkit Resources (Priority: P1) 🎯 MVP

**Goal**: Developer launches the interactive app and navigates task specs, workflows, agents, and project metadata with accurate read-only summaries.

**Independent Test**: Launch in `tests/fixtures/interactive-multi-spec/`; verify spec list (recognized + unrecognized sections), spec detail (workflow state, artifacts, lifecycle), workflow variant summaries, agents list (all vs configured filter), and project metadata view — no file mutations during browse (SC-006).

### Tests for User Story 1

> **Write these tests FIRST — they must FAIL before implementation begins**

- [ ] T019 [P] [US1] Write failing unit tests for `assembleTaskSpecSummary` including unrecognized directories and mismatch warnings in `tests/unit/interactive/read-models.test.ts`
- [ ] T020 [P] [US1] Write failing integration test for browse-only navigation across all top-level sections in `tests/integration/interactive-browse.test.ts`

### Implementation for User Story 1

- [ ] T021 [P] [US1] Implement `assembleTaskSpecSummary` and `listTaskSpecSummaries` in `src/cli/ink/read-models/task-specs.ts` (compose `listTaskSpecDirectoryIdentities`, frontmatter, workflow state, artifact presence)
- [ ] T022 [P] [US1] Implement `listWorkflowVariantSummaries` in `src/cli/ink/read-models/workflow-variants.ts` from `readWorkflowConfig`
- [ ] T023 [P] [US1] Implement `listAgentSummaries` with configured filter in `src/cli/ink/read-models/agents.ts` (equivalent to `list agents` / `--enabled`)
- [ ] T024 [P] [US1] Implement `loadProjectMetadataView` in `src/cli/ink/read-models/project-metadata.ts`
- [ ] T025 [US1] Implement task specs list screen with recognized and unrecognized sections in `src/cli/ink/screens/specs/specs-list.tsx` (FR-004)
- [ ] T026 [US1] Implement task spec detail screen with workflow state, artifacts, and warnings in `src/cli/ink/screens/specs/spec-detail.tsx` (FR-005)
- [ ] T027 [P] [US1] Implement workflows list screen in `src/cli/ink/screens/workflows/workflows-list.tsx` (FR-006)
- [ ] T028 [P] [US1] Implement workflow detail read-only screen in `src/cli/ink/screens/workflows/workflow-detail.tsx`
- [ ] T029 [P] [US1] Implement agents list screen with all/configured toggle in `src/cli/ink/screens/agents/agents-list.tsx` (FR-007)
- [ ] T030 [US1] Implement project metadata read-only view screen in `src/cli/ink/screens/project/project-metadata-view.tsx`
- [ ] T031 [US1] Wire US1 screens into `App.tsx` route table and main-menu navigation keys 1–4

**Checkpoint**: Browse flows pass T019–T020; developer can locate any spec in ≤20-spec fixture within interactive latency (SC-001); browse introduces no file writes.

---

## Phase 4: User Story 2 — Manage State and Configuration Interactively (Priority: P1)

**Goal**: Developer performs lifecycle, workflow, checkbox, metadata, and agent configuration mutations through the UI with byte-equivalent outcomes to non-interactive CLI.

**Independent Test**: For each write operation in `contracts/cli-operation-map.md` with `Requires task spec` or project scope, apply via interactive orchestrator path and via CLI subprocess; assert byte-identical affected files (SC-003).

### Tests for User Story 2

> **Write these tests FIRST — they must FAIL before implementation begins**

- [ ] T032 [P] [US2] Write failing parity integration test skeleton in `tests/integration/interactive-cli-parity.test.ts` covering `task.status.set`, `task.checkbox.set`, `project.metadata.write`
- [ ] T033 [P] [US2] Write failing parity tests for `config.agent.add`, `config.agent.remove`, `workflow.state.write` in `tests/integration/interactive-cli-parity.test.ts`

### Implementation for User Story 2

- [ ] T034 [US2] Implement spec mutations submenu screen in `src/cli/ink/screens/specs/spec-mutations.tsx` (shortcuts to supported mutations per FR-008)
- [ ] T035 [P] [US2] Implement task status set interactive flow calling `setTaskSpecStatus` in `src/cli/ink/screens/specs/task-status-set.tsx`
- [ ] T036 [P] [US2] Implement task checkbox set interactive flow calling `setTaskCheckboxes` in `src/cli/ink/screens/specs/task-checkbox-set.tsx`
- [ ] T037 [US2] Implement workflow state read display and write form with overwrite confirmation in `src/cli/ink/screens/specs/workflow-state.tsx` (FR-012)
- [ ] T038 [P] [US2] Implement agent add screen reusing `add-agent-prompt.tsx` and `runConfigAgentAdd` in `src/cli/ink/screens/agents/agent-add.tsx` (FR-010)
- [ ] T039 [US2] Implement agent remove screen with explicit confirmation and `runConfigAgentRemove` in `src/cli/ink/screens/agents/agent-remove.tsx` (FR-012)
- [ ] T040 [US2] Implement project metadata edit form calling `writeProjectMetadata` in `src/cli/ink/screens/project/project-metadata-edit.tsx`
- [ ] T041 [US2] Complete parity coverage for all write rows in `contracts/cli-operation-map.md` in `tests/integration/interactive-cli-parity.test.ts` (SC-003)
- [ ] T042 [US2] Wire mutation screens into `App.tsx` routes; ensure read-only list/detail/view routes never invoke write orchestrators (FR-013)

**Checkpoint**: T032–T033 and T041 pass; agent add/remove and task status flows completable with on-screen key hints (SC-004 partial); destructive flows require confirmation.

---

## Phase 5: User Story 3 — Run Setup and Maintenance Operations (Priority: P2)

**Goal**: Developer runs init, version, update, step instantiate, and spec frontmatter update through the interactive app with CLI-equivalent outcomes.

**Independent Test**: Run init in empty fixture via setup menu; version display matches `version` report fields; update with confirmation matches `update`; step instantiate and frontmatter update match CLI for same inputs (quickstart scenarios 4–6, 8).

### Tests for User Story 3

> **Write these tests FIRST — they must FAIL before implementation begins**

- [ ] T043 [P] [US3] Write failing integration test for setup menu flows (init, version, update dry-run/apply) in `tests/integration/interactive-setup.test.ts`

### Implementation for User Story 3

- [ ] T044 [US3] Implement setup/maintenance menu screen in `src/cli/ink/screens/setup/setup-menu.tsx`
- [ ] T045 [P] [US3] Implement init flow reusing `promptForAgentSelection` and `runInit` in `src/cli/ink/screens/setup/setup-init.tsx` (FR-010)
- [ ] T046 [P] [US3] Implement version info screen using `buildVersionReport` in `src/cli/ink/screens/setup/setup-version.tsx` (FR-015)
- [ ] T047 [US3] Implement update flow reusing `update-prompts.tsx` and `runUpdate` in `src/cli/ink/screens/setup/setup-update.tsx` (FR-010, FR-012)
- [ ] T048 [P] [US3] Implement step instantiate interactive form calling `instantiateStepOutput` in `src/cli/ink/screens/specs/step-instantiate.tsx`
- [ ] T049 [P] [US3] Implement spec frontmatter update form calling `updateSpecFrontmatter` in `src/cli/ink/screens/specs/spec-frontmatter-update.tsx`
- [ ] T050 [US3] Add parity tests for `init`, `update`, `step.instantiate`, `spec.frontmatter.update` in `tests/integration/interactive-cli-parity.test.ts`
- [ ] T051 [US3] Wire setup routes into `App.tsx` and main-menu key 5; link spec-mutation shortcuts to T048–T049

**Checkpoint**: 100% of `contracts/cli-operation-map.md` operations reachable from interactive UI (SC-002); T043 passes.

---

## Phase 6: User Story 4 — Navigate Efficiently with Keyboard-First Interaction (Priority: P2)

**Goal**: Developer completes browse and mutation flows using only keyboard controls with visible focus, scroll behavior, key hints, and safe quit.

**Independent Test**: Using only arrow keys, Enter, `b`/`Esc`, and `q`, visit every top-level section, complete one mutation with confirmation, and exit cleanly without partial writes (quickstart scenario 10).

### Tests for User Story 4

> **Write these tests FIRST — they must FAIL before implementation begins**

- [ ] T052 [P] [US4] Write failing `ink-testing-library` navigation test reaching all five main-menu sections and returning in `tests/unit/interactive/screens/navigation-complete.test.tsx`
- [ ] T053 [P] [US4] Write failing read-only session test verifying no file mutations during exploratory navigation in `tests/integration/interactive-read-only.test.ts` (SC-006)

### Implementation for User Story 4

- [ ] T054 [US4] Add scroll-into-view behavior for `SelectableList` when focused item exceeds terminal height in `src/cli/ink/components/SelectableList.tsx`
- [ ] T055 [P] [US4] Implement global key-hint overlay toggle (`?`) in `src/cli/ink/components/KeyHintOverlay.tsx` and wire in `App.tsx`
- [ ] T056 [US4] Ensure destructive action flows block until `ConfirmDialog` accepted across update, agent remove, and workflow overwrite screens
- [ ] T057 [US4] Ensure `q` quit unmounts Ink without in-flight unconfirmed writes in `src/cli/interactive/launch.ts`
- [ ] T058 [US4] Display binary context (`local`/`global`/`direct`) in `StatusBar` using `buildVersionReport` in `src/cli/ink/components/StatusBar.tsx` (FR-015)

**Checkpoint**: T052–T053 pass; keyboard-only flows meet User Story 4 acceptance scenarios.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, quickstart validation, and cross-story hardening.

- [ ] T059 [P] Update `docs/cli.md` interactive section to document bare launch, main-menu sections, keyboard bindings, and CLI parity per `contracts/interactive-app.md`
- [ ] T060 [P] Update `src/cli/README.md` to describe bare vs subcommand invocation and `src/cli/interactive/launch.ts` entry
- [ ] T061 Run all scenarios in `specs/002-ink-interactive-cli/quickstart.md` and fix gaps
- [ ] T062 [P] Add `src/cli/ink/components/README.md` describing shared list, confirm, and status primitives
- [ ] T063 [P] Add `src/cli/ink/read-models/README.md` describing query assembly boundaries (read-only, no writes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP browse layer
- **User Story 2 (Phase 4)**: Depends on US1 spec list/detail/selection (uses read models and navigation)
- **User Story 3 (Phase 5)**: Depends on Foundational; init flow independent of US1; update/instantiate benefit from US2 task-spec selection
- **User Story 4 (Phase 6)**: Depends on US1–US3 screens existing to test full navigation surface
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

```text
Foundational (Phase 2)
        │
        ▼
   US1 Browse (P1) ──► US2 Mutations (P1)
        │                      │
        └──────────┬───────────┘
                   ▼
            US3 Setup (P2)
                   │
                   ▼
            US4 Keyboard (P2)
                   │
                   ▼
              Polish (Phase 7)
```

- **US1**: Independent after Foundational — no writes required
- **US2**: Depends on US1 for spec navigation and read models; independently testable via parity tests once spec screens exist
- **US3**: Init/version independent; update and instantiate flows integrate with US2 selection patterns
- **US4**: Cross-cutting polish validated once prior stories ship screens

### Parallel Opportunities

- **Phase 1**: T003, T004 in parallel after T002
- **Phase 2**: T007–T011, T017–T018 in parallel after T005–T006; T013 parallel with T012 after components exist
- **Phase 3**: T019–T020 parallel; T021–T024 parallel; T027–T029 parallel after read models
- **Phase 4**: T032–T033 parallel; T035–T036, T038 parallel after T034
- **Phase 5**: T045–T046, T048–T049 parallel after T044
- **Phase 6**: T052–T053 parallel; T054–T055 parallel
- **Phase 7**: T059–T060, T062–T063 parallel

### Parallel Example: User Story 1

```bash
# Read models in parallel:
T021: src/cli/ink/read-models/task-specs.ts
T022: src/cli/ink/read-models/workflow-variants.ts
T023: src/cli/ink/read-models/agents.ts
T024: src/cli/ink/read-models/project-metadata.ts

# Screens in parallel after T025 spec list exists:
T027: src/cli/ink/screens/workflows/workflows-list.tsx
T028: src/cli/ink/screens/workflows/workflow-detail.tsx
T029: src/cli/ink/screens/agents/agents-list.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Browse flows, SC-001, SC-005, SC-006 read-only guarantee
5. Demo interactive discovery without mutations

### Incremental Delivery

1. Setup + Foundational → bare launch works
2. US1 → browse all resources (MVP)
3. US2 → daily state/config mutations with CLI parity
4. US3 → setup/maintenance parity (SC-002 complete)
5. US4 → keyboard UX hardening
6. Polish → docs + quickstart sign-off

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: US1 read models + spec screens
   - Developer B: US1 workflow/agents/project screens (after read models)
3. US2 mutations split by screen file (`task-status-set.tsx`, `agent-add.tsx`, etc.)
4. US3 setup screens parallelizable after menu shell

---

## Notes

- Interactive screens MUST call `run*` orchestrators and `src/core/` entries from `contracts/cli-operation-map.md` — never duplicate mutation logic (FR-009)
- Reuse `init-prompts.tsx`, `update-prompts.tsx`, `add-agent-prompt.tsx` — do not fork equivalent UX (FR-010)
- Agent slash commands remain out of scope (FR-016); optional guidance text only
- Stop at any checkpoint to validate story independently before proceeding
