# Tasks: Instance-Aware Ink Screens

**Input**: Design documents from `specs/005-ink-instance-screens/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Test tasks are included because the implementation plan and constitution require coverage for instance homes, quit confirmation, remove orchestrator, task metadata, and navigation changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review design artifacts and existing interactive CLI boundaries before implementation.

- [X] T001 Review instance screen contracts in `specs/005-ink-instance-screens/contracts/interactive-instances.md`, `specs/005-ink-instance-screens/contracts/cli-remove-command.md`, and `specs/005-ink-instance-screens/contracts/task-metadata.schema.json`
- [X] T002 [P] Review current navigation, session, and launch flow in `src/cli/ink/app/navigation.ts`, `src/cli/ink/app/session-context.tsx`, and `src/cli/interactive/launch.ts`
- [X] T003 [P] Review version detection and project orchestrators in `src/cli/commands/version.ts`, `src/cli/commands/init.ts`, `src/cli/commands/update.ts`, and `src/cli/local-binaries.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that MUST complete before user story screens can render or mutate correctly.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create `scripts/write-source-package-root.mjs` and invoke it from the `build` script in `package.json` to write `dist/cli/.source-package-root` (excluded from npm publish via existing `"files": ["dist"]` packaging rules)
- [X] T005 [P] Implement `readInstallSource` read model in `src/cli/ink/read-models/install-source.ts` per `specs/005-ink-instance-screens/data-model.md`
- [X] T006 [P] Implement version comparison read model (npm registry, linked source, global install targets) in `src/cli/ink/read-models/version-comparison.ts`
- [X] T007 [P] Implement per-task metadata read/write API in `src/core/task-metadata.ts` per `specs/005-ink-instance-screens/contracts/task-metadata.schema.json`
- [X] T008 Add route ids `global-home`, `local-home`, `project-hub`, and `manage-local` with titles, fallback summaries, and instance-specific root stacks in `src/cli/ink/app/navigation.ts`
- [X] T009 Update `launchInteractiveApp` and `SessionProvider` to seed the navigation root from `binaryContext` in `src/cli/interactive/launch.ts` and `src/cli/ink/app/session-context.tsx`
- [X] T010 [P] Create `StaticContentBlock` labeled-field renderer in `src/cli/ink/components/StaticContentBlock.tsx`
- [X] T011 [P] Create shared `buildBackMenuItem` helper in `src/cli/ink/components/menu/back-menu-item.ts`
- [X] T012 Implement `reloadInteractiveApp` spawn-and-exit helper in `src/cli/ink/reload.ts`
- [X] T013 Implement `runProjectRemove` orchestrator and Commander registration in `src/cli/commands/remove.ts` per `specs/005-ink-instance-screens/contracts/cli-remove-command.md`
- [X] T014 Register `remove` command on the full CLI program in `src/cli/index.ts`
- [X] T015 Update `claimImplementSlot` to write `implementationStartedAt` to task metadata and stop persisting `implementationStartedAt` on project metadata in `src/core/project-metadata.ts`
- [X] T016 Write `createdAt` to task metadata when a task spec directory is created in `src/specs/specify.ts`
- [X] T017 [P] Add failing unit tests for install source and version comparison in `tests/unit/interactive/read-models/version-comparison.test.ts`
- [X] T018 [P] Add failing unit tests for task metadata read/write in `tests/unit/core/task-metadata.test.ts`
- [X] T019 [P] Add failing unit tests for `runProjectRemove` in `tests/unit/cli/remove.test.ts`
- [X] T020 Add `RouteRenderer` cases for new route ids (placeholder components acceptable until story phases) in `src/cli/ink/app/App.tsx`

**Checkpoint**: Navigation roots, read models, task metadata persistence, remove orchestrator, and build marker are ready.

---

## Phase 3: User Story 1 - Global Instance Home and Installation Management (Priority: P1) 🎯 MVP

**Goal**: Global CLI operators see install source, version freshness, project context, and can update, init, remove, or re-install from a dedicated home screen.

**Independent Test**: Launch as global instance against initialized and uninitialized projects; verify content block, option enablement, and update/init/remove/re-install actions per `specs/005-ink-instance-screens/quickstart.md`.

### Tests for User Story 1

- [X] T021 [P] [US1] Add failing integration tests for global home content and menu enablement in `tests/integration/interactive-global-home.test.ts`

### Implementation for User Story 1

- [X] T022 [P] [US1] Implement `loadGlobalHomeContent` read model in `src/cli/ink/read-models/global-home-content.ts`
- [X] T023 [US1] Implement `GlobalHomeScreen` with static content area and five menu options in `src/cli/ink/screens/global-home.tsx`
- [X] T024 [US1] Wire Update Spec N' Roll (linked-source build + reload vs `npm install -g` + reload) in `src/cli/ink/screens/global-home.tsx` using `src/cli/ink/reload.ts`
- [X] T025 [US1] Wire Init Project action to existing init orchestrator in `src/cli/ink/screens/global-home.tsx`
- [X] T026 [US1] Wire Remove and Re-install actions with `ConfirmDialog` calling `runProjectRemove` and init in `src/cli/ink/screens/global-home.tsx`
- [X] T027 [US1] Verify User Story 1 with `npm test -- tests/integration/interactive-global-home.test.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable on global instance.

---

## Phase 4: User Story 2 - Local Instance Home and Project Navigation (Priority: P1)

**Goal**: Local CLI developers see version comparison, project/task orientation, and navigate to Project, Agents, Workflows, Manage, or Quit.

**Independent Test**: Launch local instance with initialized project and active task; verify content blocks, Extensions disabled, and navigation targets per `specs/005-ink-instance-screens/contracts/interactive-instances.md`.

### Tests for User Story 2

- [X] T028 [P] [US2] Add failing unit tests for local home content blocks in `tests/unit/interactive/read-models/local-home-content.test.ts`
- [X] T029 [P] [US2] Add failing integration tests for local home routing in `tests/integration/interactive-local-home.test.ts`

### Implementation for User Story 2

- [X] T030 [P] [US2] Implement `loadLocalHomeContent` read model (project metadata + task metadata timestamps) in `src/cli/ink/read-models/local-home-content.ts`
- [X] T031 [US2] Implement `LocalHomeScreen` with static content and six menu options in `src/cli/ink/screens/local-home.tsx`
- [X] T032 [US2] Wire navigation to `project-hub`, `agents-list`, `workflows-list`, `manage-local`, and permanently disabled Extensions in `src/cli/ink/screens/local-home.tsx`
- [X] T033 [US2] Verify User Story 2 with `npm test -- tests/unit/interactive/read-models/local-home-content.test.ts tests/integration/interactive-local-home.test.ts`

**Checkpoint**: User Stories 1 and 2 both work independently on their respective instance types.

---

## Phase 5: User Story 3 - Project Screen and Specification Summary (Priority: P2)

**Goal**: Developers open a Project hub showing spec health summary and navigate to Specs or Project Metadata.

**Independent Test**: From local home, open Project hub and verify most recent spec, status counts, and navigation to `specs-list` and renamed Project Metadata screen.

### Tests for User Story 3

- [X] T034 [P] [US3] Add failing unit tests for project hub aggregation in `tests/unit/interactive/read-models/project-hub.test.ts`

### Implementation for User Story 3

- [X] T035 [P] [US3] Implement `loadProjectHubView` read model in `src/cli/ink/read-models/project-hub.ts`
- [X] T036 [US3] Implement `ProjectHubScreen` with summary content and Specs / Project Metadata / Back options in `src/cli/ink/screens/project/project-hub.tsx`
- [X] T037 [US3] Rename all Project Metadata titles and labels from "Project" in `src/cli/ink/screens/project/project-metadata-view.tsx` and `src/cli/ink/app/navigation.ts`
- [X] T038 [US3] Verify User Story 3 with `npm test -- tests/unit/interactive/read-models/project-hub.test.ts`

**Checkpoint**: Project hub is reachable from local home and independently testable.

---

## Phase 6: User Story 4 - Local Installation Manage Screen (Priority: P2)

**Goal**: Developers manage local binary updates, full project upgrades, remove, and re-install from a dedicated Manage screen.

**Independent Test**: Open Manage from local home; verify update disabled when versions match; confirm binary-only update does not mutate project config; verify upgrade/remove/re-install flows.

### Implementation for User Story 4

- [X] T039 [P] [US4] Implement `ManageLocalScreen` with static content and five menu options in `src/cli/ink/screens/manage/manage-local.tsx`
- [X] T040 [US4] Wire Update Spec N' Roll to copy global binary via `installProjectBinaries` and reload in `src/cli/ink/screens/manage/manage-local.tsx`
- [X] T041 [US4] Wire Upgrade Project to `runUpdate` orchestrator in `src/cli/ink/screens/manage/manage-local.tsx`
- [X] T042 [US4] Wire Remove and Re-install with confirmation using `runProjectRemove` and init in `src/cli/ink/screens/manage/manage-local.tsx`
- [X] T043 [US4] Extend manage screen coverage in `tests/integration/interactive-local-home.test.ts`

**Checkpoint**: Manage screen actions work independently of Project hub navigation.

---

## Phase 7: User Story 5 - Safe Quit with Double-Press Confirmation (Priority: P2)

**Goal**: Accidental quit is prevented via double-`q` within 3 seconds; home `Esc` triggers the same flow; sub-screen `Esc` remains back navigation.

**Independent Test**: Press `q` once and confirm message; double-`q` exits; other key or timeout cancels; home `Esc` matches `q`; sub-screen `Esc` pops route.

### Tests for User Story 5

- [X] T044 [P] [US5] Add failing unit tests for quit confirmation timing and cancellation in `tests/unit/interactive/quit-confirmation.test.ts`

### Implementation for User Story 5

- [X] T045 [US5] Implement `useQuitConfirmation` hook with 3-second pending state in `src/cli/ink/hooks/use-quit-confirmation.ts`
- [X] T046 [US5] Replace immediate `q` exit with quit confirmation flow in `src/cli/ink/app/App.tsx`
- [X] T047 [US5] Route home-screen `Esc` through quit confirmation while preserving sub-screen `popRoute` for `Esc` in `src/cli/ink/app/App.tsx`
- [X] T048 [US5] Verify User Story 5 with `npm test -- tests/unit/interactive/quit-confirmation.test.ts`

**Checkpoint**: Quit confirmation applies globally without breaking back navigation on sub-screens.

---

## Phase 8: User Story 6 - Task Spec Timestamps Owned by Task Spec Metadata (Priority: P2)

**Goal**: Task creation and implementation-start timestamps live in per-task metadata; project metadata copies are ignored for display and no longer edited.

**Independent Test**: Create task and start implementation; confirm timestamps in `specs/{id}-{slug}/.spec-n-roll/task-metadata.json`; local home omits lines when fields absent; project metadata edit no longer exposes implementation timestamp.

### Tests for User Story 6

- [X] T049 [P] [US6] Add assertions that local home ignores project metadata timestamp fields in `tests/unit/interactive/read-models/local-home-content.test.ts`

### Implementation for User Story 6

- [X] T050 [US6] Remove `implementationStartedAt` from project metadata edit flow in `src/cli/ink/screens/project/project-metadata-edit.tsx`
- [X] T051 [US6] Remove `implementationStartedAt` display from project metadata view read model usage in `src/cli/ink/read-models/project-metadata.ts` and `src/cli/ink/screens/project/project-metadata-view.tsx`
- [X] T052 [US6] Verify task metadata writers and readers with `npm test -- tests/unit/core/task-metadata.test.ts tests/unit/interactive/read-models/local-home-content.test.ts`

**Checkpoint**: Task provenance is task-scoped; legacy project metadata fields are ignored.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Back navigation rows, legacy route cleanup, documentation, and full validation.

- [X] T053 Append Back as last selectable item on list routes (`specs-list`, `workflows-list`, `agents-list`, `setup-menu`, `project-metadata-view`, and other non-home list screens) using `src/cli/ink/components/menu/back-menu-item.ts`
- [X] T054 Retire `main-menu` as root route and remove primary navigation to `setup-menu` in `src/cli/ink/app/App.tsx` and `src/cli/ink/app/navigation.ts`
- [X] T055 [P] Update directory README overviews in `src/cli/ink/screens/README.md`, `src/cli/ink/read-models/README.md`, and `src/cli/ink/hooks/README.md`
- [X] T056 [P] Extend Back navigation assertions in `tests/integration/interactive-browse.test.ts`
- [X] T057 Add non-interactive `remove --yes` scenario in `tests/integration/cli-non-interactive.test.ts`
- [X] T058 Run quickstart validation commands from `specs/005-ink-instance-screens/quickstart.md`
- [X] T059 Run `npm test` and `npm run lint` for all affected interactive and CLI areas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–8)**: Depend on Foundational completion
  - US1 (global home) and US2 (local home) can proceed **in parallel** after Phase 2
  - US3 depends on US2 navigation to `project-hub` for end-to-end manual flows but read model/tests are independent
  - US4 depends on US2 navigation to `manage-local`; shares `runProjectRemove` from Phase 2
  - US5 (quit) can proceed in parallel with US3/US4 once Phase 2 App route wiring exists
  - US6 display cleanup depends on US2 local home read model existing
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test surface |
|-------|----------|------------|----------------------------|
| US1 | P1 | Phase 2 | Global instance launch + global-home tests |
| US2 | P1 | Phase 2 | Local instance launch + local-home tests |
| US3 | P2 | Phase 2; manual path from US2 | Project hub unit tests |
| US4 | P2 | Phase 2; manual path from US2 | Manage actions in local-home integration tests |
| US5 | P2 | Phase 2 App shell | Quit confirmation unit tests |
| US6 | P2 | Phase 2 task metadata + US2 read model | Task metadata + local-home unit tests |

### Parallel Opportunities

- **Phase 1**: T002 and T003 in parallel
- **Phase 2**: T005, T006, T007, T010, T011, T017, T018, T019 in parallel after T004
- **After Phase 2**: US1 (Phase 3) and US2 (Phase 4) in parallel on separate instance paths
- **After Phase 2**: US5 quit hook (Phase 7) can run parallel to US3/US4
- **Phase 9**: T055 and T056 in parallel

---

## Parallel Example: User Story 1

```bash
# Tests + read model together:
# T021 integration tests in tests/integration/interactive-global-home.test.ts
# T022 loadGlobalHomeContent in src/cli/ink/read-models/global-home-content.ts

# Then sequential screen wiring T023–T026 depends on T022
```

---

## Parallel Example: User Story 2

```bash
# Launch together after Phase 2:
# T028 unit tests in tests/unit/interactive/read-models/local-home-content.test.ts
# T029 integration tests in tests/integration/interactive-local-home.test.ts
# T030 loadLocalHomeContent in src/cli/ink/read-models/local-home-content.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical**)
3. Complete Phase 3: User Story 1 (global home)
4. **STOP and VALIDATE**: `npm test -- tests/integration/interactive-global-home.test.ts`
5. Demo global install management before local instance work

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready
2. US1 Global home → validate global operator workflow (**MVP**)
3. US2 Local home → validate developer daily entry point
4. US3 Project hub + US4 Manage → deepen local navigation
5. US5 Quit confirmation → safety across all screens
6. US6 Task metadata display cleanup → complete timestamp ownership
7. Phase 9 Polish → Back rows, legacy cleanup, full suite

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 global home (Phase 3)
   - Developer B: US2 local home (Phase 4)
   - Developer C: US5 quit confirmation (Phase 7)
3. Then US3, US4, US6, and Polish sequentially or split by screen

---

## Notes

- All tasks use checkbox + Task ID + optional `[P]` + optional `[Story]` + file path format
- Legacy `src/cli/ink/screens/main-menu.tsx` may remain until T054 removes it from routing; do not delete until replacements pass tests
- `setup-init`, `setup-update`, and related routes stay as orchestration targets invoked from global/manage screens
- Preserve feature 004 `RouteContentLayout` patterns: home/manage screens use static upper content, not focus-driven context swapping
