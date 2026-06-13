# Tasks: Ink Route Layout and App Scaffolding

**Input**: Design documents from `specs/004-ink-route-layout/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-layout.md`, `quickstart.md`

**Tests**: Test tasks are included because the implementation plan and constitution require layout, route-content, key-hint, and read-only navigation coverage for this behavioral refactor.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review existing shell and layout code before restructuring.

- [X] T001 Review current shell composition and context ownership boundaries in `src/cli/ink/app/App.tsx`
- [X] T002 [P] Review row allocation helpers and `ContextContent` types in `src/cli/ink/components/ContextContent.tsx`
- [X] T003 [P] Review selection row reporting and key hint rendering in `src/cli/ink/components/SelectionRegion.tsx` and `src/cli/ink/components/KeyHintOverlay.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared scaffolding and route-content layout primitives that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create failing unit tests for app scaffolding region order and fixed chrome sizing in `tests/unit/interactive/layout.test.ts`
- [X] T005 Create failing unit tests for route content layout selection sizing and content fill in `tests/unit/interactive/route-content-layout.test.ts`
- [X] T006 Create failing unit tests for centered fixed-height key hint overlay in `tests/unit/interactive/key-hint-overlay.test.ts`
- [X] T007 Define `AppScaffoldingLayout`, `AppScaffoldingLayoutRequest`, and `allocateAppScaffoldingLayout` with multiline doc comments in `src/cli/ink/components/ContextContent.tsx`
- [X] T008 Define `RouteContentLayoutAllocation`, `RouteContentLayoutRequest`, and `allocateRouteContentLayout` with multiline doc comments in `src/cli/ink/components/ContextContent.tsx`
- [X] T009 Create `RouteContentLayout` component skeleton and exported props type in `src/cli/ink/components/RouteContentLayout.tsx`
- [X] T010 Extract shared layout row constants (`STATUS_REGION_ROWS`, `KEY_HINT_REGION_ROWS`) for scaffolding use in `src/cli/ink/app/App.tsx` and `src/cli/ink/components/ContextContent.tsx`
- [X] T011 Update component overview for scaffolding and route content layout responsibilities in `src/cli/ink/components/README.md`

**Checkpoint**: Shared layout types, allocators, and component skeleton are ready for user story implementation.

---

## Phase 3: User Story 1 - Consistent App Shell Across Routes (Priority: P1) 🎯 MVP

**Goal**: Every route renders inside a stable frame with fixed status bar and key hint overlay and a flexible route content slot between them.

**Independent Test**: Visit multiple primary routes and verify status bar and key hint overlay keep stable heights while only the middle region changes; resize the terminal and confirm fixed chrome does not change height.

### Tests for User Story 1

- [X] T012 [P] [US1] Add failing scaffolding region-order assertions per `specs/004-ink-route-layout/contracts/ui-layout.md` in `tests/unit/interactive/layout.test.ts`
- [X] T013 [P] [US1] Add failing fixed-chrome resize assertions in `tests/unit/interactive/layout.test.ts`
- [X] T014 [P] [US1] Add failing route-swap middle-region replacement assertions in `tests/unit/interactive/layout.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Refactor `AppShell` to scaffolding-only composition (status bar, route slot, key hint overlay) in `src/cli/ink/app/App.tsx`
- [X] T016 [US1] Replace `allocateFullscreenLayout` usage with `allocateAppScaffoldingLayout` and pass `routeContentRows` to routed screens in `src/cli/ink/app/App.tsx`
- [X] T017 [US1] Remove shell-level `ContextContent` rendering and global selected-context state from `src/cli/ink/app/App.tsx`
- [X] T018 [US1] Render `RouteRenderer` as the sole owner of the route content slot interior in `src/cli/ink/app/App.tsx`
- [X] T019 [US1] Reserve fixed `keyHintRows` in scaffolding allocation even when hints are toggled hidden in `src/cli/ink/app/App.tsx`
- [X] T020 [US1] Update minimum-size calculation and message for the new scaffolding model in `src/cli/ink/app/App.tsx`
- [X] T021 [US1] Verify User Story 1 with `npm test -- tests/unit/interactive/layout.test.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Route Content with Selection and Detail Areas (Priority: P1)

**Goal**: Routes that present choices use a reusable layout with a selection list sized to option count and a content area filling remaining route slot rows.

**Independent Test**: Open a route using `RouteContentLayout`, change option count, and verify selection height tracks options while content area fills leftover space; move focus and confirm content updates without shell height changes.

### Tests for User Story 2

- [X] T022 [P] [US2] Add failing selection-list height tracks option-count assertions in `tests/unit/interactive/route-content-layout.test.ts`
- [X] T023 [P] [US2] Add failing content-area fills-remainder assertions in `tests/unit/interactive/route-content-layout.test.ts`
- [X] T024 [P] [US2] Add failing focus-updates-content-without-shell-change assertions in `tests/unit/interactive/route-content-layout.test.ts`

### Implementation for User Story 2

- [X] T025 [US2] Implement `RouteContentLayout` with upper `ContextContent` and lower selection slot in `src/cli/ink/components/RouteContentLayout.tsx`
- [X] T026 [US2] Wire `SelectionRowProvider` and `allocateRouteContentLayout` inside `RouteContentLayout` in `src/cli/ink/components/RouteContentLayout.tsx`
- [X] T027 [US2] Accept `routeContentRows` and `ContextContentState` props and pass computed `contentRows` to `ContextContent` in `src/cli/ink/components/RouteContentLayout.tsx`
- [X] T028 [US2] Migrate `MainMenu` to compose via `RouteContentLayout` as the reference list route in `src/cli/ink/screens/main-menu.tsx`
- [X] T029 [US2] Verify User Story 2 with `npm test -- tests/unit/interactive/route-content-layout.test.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 4 - Each Route Owns Its Layout Content (Priority: P1)

**Goal**: Each route supplies its own selection options and content material; form and detail routes use the full route slot without an empty selection region.

**Independent Test**: Compare main menu and task specs list at the same terminal size and verify distinct selection options and content; open a form route and confirm it uses the full route slot.

### Tests for User Story 4

- [X] T030 [P] [US4] Add failing distinct per-route content and selection assertions in `tests/integration/interactive-browse.test.ts`
- [X] T031 [P] [US4] Add failing full-slot form and detail route assertions in `tests/unit/interactive/screens/navigation-complete.test.ts`

### Implementation for User Story 4

- [X] T032 [US4] Migrate task specs list to `RouteContentLayout` with route-owned context and selection in `src/cli/ink/screens/specs/specs-list.tsx`
- [X] T033 [US4] Migrate workflows list to `RouteContentLayout` in `src/cli/ink/screens/workflows/workflows-list.tsx`
- [X] T034 [US4] Migrate agents list to `RouteContentLayout` in `src/cli/ink/screens/agents/agents-list.tsx`
- [X] T035 [US4] Migrate setup menu to `RouteContentLayout` in `src/cli/ink/screens/setup/setup-menu.tsx`
- [X] T036 [US4] Migrate project metadata view to `RouteContentLayout` in `src/cli/ink/screens/project/project-metadata-view.tsx`
- [X] T037 [P] [US4] Ensure spec detail and mutation routes render into the full route content slot in `src/cli/ink/screens/specs/spec-detail.tsx` and `src/cli/ink/screens/specs/spec-mutations.tsx`
- [X] T038 [P] [US4] Ensure form and confirmation routes use the full route slot in `src/cli/ink/screens/specs/task-status-set.tsx`, `src/cli/ink/screens/specs/workflow-state.tsx`, and `src/cli/ink/screens/project/project-metadata-edit.tsx`
- [X] T039 [US4] Remove obsolete shell `onContextChange` callback wiring from `src/cli/ink/app/App.tsx` and routed screen prop types
- [X] T040 [US4] Update app shell overview for route-owned content slot in `src/cli/ink/app/README.md`
- [X] T041 [US4] Verify User Story 4 with `npm test -- tests/integration/interactive-browse.test.ts tests/unit/interactive/screens/navigation-complete.test.ts`

**Checkpoint**: User Stories 1, 2, and 4 are independently functional.

---

## Phase 6: User Story 3 - Centered Keyboard Guidance (Priority: P2)

**Goal**: Key hint overlay content is horizontally centered within fixed-height bottom chrome and can show route-specific supplemental hints.

**Independent Test**: Open routes with key hints at narrow and wide terminal widths and verify centered hint text; toggle hints with `?` and confirm overlay height stays fixed.

### Tests for User Story 3

- [X] T042 [P] [US3] Add failing horizontally-centered hint assertions in `tests/unit/interactive/key-hint-overlay.test.ts`
- [X] T043 [P] [US3] Add failing fixed-height overlay when hints are hidden assertions in `tests/unit/interactive/key-hint-overlay.test.ts`

### Implementation for User Story 3

- [X] T044 [US3] Center key hint text as a group within the fixed overlay region in `src/cli/ink/components/KeyHintOverlay.tsx`
- [X] T045 [US3] Add optional per-route supplemental hint descriptors in `src/cli/ink/app/navigation.ts`
- [X] T046 [US3] Merge global and route-specific hints in scaffolding render path in `src/cli/ink/app/App.tsx` and `src/cli/ink/components/KeyHintOverlay.tsx`
- [X] T047 [US3] Verify User Story 3 with `npm test -- tests/unit/interactive/key-hint-overlay.test.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and regression checks across all stories.

- [X] T048 [P] Update screens directory overview for route-owned layout pattern in `src/cli/ink/screens/README.md`
- [X] T049 [P] Update interactive Ink overview for two-level layout model in `src/cli/ink/README.md`
- [X] T050 Run quickstart validation scenarios in `specs/004-ink-route-layout/quickstart.md`
- [X] T051 Run full interactive test suite with `npm test -- tests/unit/interactive tests/integration/interactive-browse.test.ts tests/integration/interactive-read-only.test.ts`
- [X] T052 Run `npm run lint` for touched `src/cli/ink/` and `tests/unit/interactive/` files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP scaffolding target
- **User Story 2 (Phase 4)**: Depends on Foundational and US1 route slot hosting
- **User Story 4 (Phase 5)**: Depends on US2 `RouteContentLayout` for list routes; full-slot routes can proceed after US1
- **User Story 3 (Phase 6)**: Depends on US1 scaffolding; can run in parallel with US4 after US1 completes
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

```text
Foundational → US1 (scaffolding) → US2 (RouteContentLayout) → US4 (route migrations)
Foundational → US1 (scaffolding) → US3 (centered key hints)
```

- **US1**: No story dependencies after Foundational
- **US2**: Requires US1 route content slot
- **US4**: Requires US2 for list/menu routes; full-slot routes need only US1
- **US3**: Requires US1 fixed overlay slot; independent of US2/US4

### Parallel Opportunities

- **Phase 1**: T002 and T003 in parallel after T001
- **Phase 2**: T004, T005, T006 in parallel; T007–T009 sequential on layout files
- **US1 tests**: T012, T013, T014 in parallel
- **US4 migrations**: T032–T036 sequential per screen; T037 and T038 in parallel after US2
- **US3 tests**: T042 and T043 in parallel
- **Polish**: T048 and T049 in parallel

---

## Parallel Example: User Story 4

```bash
# After US2 completes, migrate independent list screens in parallel:
Task: "Migrate workflows list to RouteContentLayout in src/cli/ink/screens/workflows/workflows-list.tsx"
Task: "Migrate agents list to RouteContentLayout in src/cli/ink/screens/agents/agents-list.tsx"
Task: "Migrate setup menu to RouteContentLayout in src/cli/ink/screens/setup/setup-menu.tsx"

# Full-slot routes can run in parallel:
Task: "Ensure spec detail uses full route slot in src/cli/ink/screens/specs/spec-detail.tsx"
Task: "Ensure form routes use full route slot in src/cli/ink/screens/specs/task-status-set.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test -- tests/unit/interactive/layout.test.ts`
5. Scaffolding frame is usable; routes still render in slot (may use interim layout)

### Incremental Delivery

1. Setup + Foundational → layout primitives ready
2. US1 → stable app shell (MVP)
3. US2 → `RouteContentLayout` with main menu reference
4. US4 → all list routes and full-slot form routes migrated
5. US3 → centered route-aware key hints
6. Polish → quickstart and full regression suite

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3): delivers fixed status bar, fixed key hint region, and route-owned content slot with resize behavior. This is the minimum vertical slice before route interior migration.

---

## Notes

- Supersedes the shell region model from `specs/003-ink-content-area`; preserve read-only focus context behavior during migration.
- `allocateFullscreenLayout` may remain as a thin adapter during transition but scaffolding code should use `allocateAppScaffoldingLayout`.
- Selection list sizing uses existing `useSelectionRowContribution` / `SelectionRowProvider` moved inside `RouteContentLayout`.
- Commit after each task or logical group; stop at any checkpoint to validate story independence.
