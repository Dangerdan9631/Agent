# Tasks: Ink Context Content Area

**Input**: Design documents from `specs/003-ink-content-area/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-layout.md`, `quickstart.md`

**Tests**: Test tasks are included because the implementation plan requires layout, focus, terminal-height, and read-only navigation coverage before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared contracts and locate existing interactive components before story work begins.

- [X] T001 Review current shell composition in `src/cli/ink/app/App.tsx` and record the affected render boundaries in implementation notes inside `specs/003-ink-content-area/tasks.md`
- [X] T002 [P] Review current list focus behavior in `src/cli/ink/components/SelectableList.tsx` and identify callback changes needed for focus-only context updates
- [X] T003 [P] Review representative screen data ownership in `src/cli/ink/screens/main-menu.tsx`, `src/cli/ink/screens/specs/specs-list.tsx`, `src/cli/ink/screens/workflows/workflows-list.tsx`, and `src/cli/ink/screens/agents/agents-list.tsx`

### Phase 1 Implementation Notes

- T001: `AppShell` is the active render boundary for the fullscreen frame: it owns global input, `StatusBar`, `RouteRenderer`, and `KeyHintOverlay`. `RouteRenderer` is a route switch only, so the context area should be inserted by `AppShell` between `StatusBar` and `RouteRenderer` to preserve the planned status > context > selection order without pushing route-specific screen logic into the shell.
- T002: `SelectableList` currently keeps `selectedIndex` and `windowStart` internally, updates focus from arrow-key input, and calls `onSelect` only on Enter for enabled rows. Focus-only context updates need a separate optional callback fired when the focused item changes, including after item replacement or clamping, while leaving `onSelect` as the only activation path.
- T003: Main menu data is static in `MAIN_MENU_ITEMS` with initialization-derived disabled state, so it can attach route-level context directly. Specs and workflows list screens own async read-model state from `listTaskSpecSummaries` and `listWorkflowVariantSummaries`, and their selectable rows already carry backing summaries that can feed selected-option context. Agents list owns its configured-only toggle and async `listAgentSummaries` state, but it currently renders plain `Text` rows instead of `SelectableList`, so later context work must first establish a focusable row model for agents while keeping add/remove/toggle shortcuts separate from row focus.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared context and layout primitives that every story depends on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create failing unit tests for context rendering priority and overflow behavior in `tests/unit/interactive/context-content.test.ts`
- [X] T005 Create failing unit tests for fullscreen row allocation and minimum-size behavior in `tests/unit/interactive/layout.test.ts`
- [X] T006 Define the `SelectedOptionContext`, `ContextContentState`, and `FullscreenLayout` types with multiline doc comments in `src/cli/ink/components/ContextContent.tsx`
- [X] T007 Implement pure row allocation helpers for status, context, selection, and minimum-size states in `src/cli/ink/components/ContextContent.tsx`
- [X] T008 Implement the reusable `ContextContent` renderer with warning/status/summary/detail priority handling in `src/cli/ink/components/ContextContent.tsx`
- [X] T009 Extend `SelectableListItem` with optional selected-option context metadata in `src/cli/ink/components/SelectableList.tsx`
- [X] T010 Add an optional focus-change callback to `SelectableList` in `src/cli/ink/components/SelectableList.tsx` without changing `onSelect` activation behavior
- [X] T011 Update component overview documentation for the new context area responsibilities in `src/cli/ink/components/README.md`

**Checkpoint**: Shared context primitives and list focus reporting are ready for user story implementation.

---

## Phase 3: User Story 1 - Read Context While Navigating (Priority: P1) MVP

**Goal**: Developers see useful context for the current section or focused option while navigating.

**Independent Test**: Launch the interactive app, move through the primary navigation sections, and verify the content area updates for the current route or focused option without selecting an action.

### Tests for User Story 1

- [X] T012 [P] [US1] Add failing main menu focus-context tests in `tests/unit/interactive/screens/navigation-complete.test.ts`
- [X] T013 [P] [US1] Add failing task spec list focus-context assertions in `tests/integration/interactive-browse.test.ts`
- [X] T014 [P] [US1] Add failing workflow and agent focus-context assertions in `tests/integration/interactive-browse.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Add shell-level selected-context state and render `ContextContent` between `StatusBar` and `RouteRenderer` in `src/cli/ink/app/App.tsx`
- [X] T016 [US1] Add fallback route context generation for all route ids in `src/cli/ink/app/navigation.ts`
- [X] T017 [US1] Add context metadata for main menu items in `src/cli/ink/screens/main-menu.tsx`
- [X] T018 [US1] Add context metadata for task spec rows, including lifecycle status, workflow status, step summary, and warnings in `src/cli/ink/screens/specs/specs-list.tsx`
- [X] T019 [US1] Add context metadata for workflow rows in `src/cli/ink/screens/workflows/workflows-list.tsx`
- [X] T020 [US1] Add context metadata for agent rows and configured-only state in `src/cli/ink/screens/agents/agents-list.tsx`
- [X] T021 [US1] Add context metadata for project and setup menu choices in `src/cli/ink/screens/project/project-metadata-view.tsx` and `src/cli/ink/screens/setup/setup-menu.tsx`
- [X] T022 [US1] Verify User Story 1 with `npm test -- tests/unit/interactive/screens/navigation-complete.test.ts tests/integration/interactive-browse.test.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Use Full Terminal Height Effectively (Priority: P1)

**Goal**: The app uses the full terminal height, with the content area absorbing available extra rows between status and selection regions.

**Independent Test**: Render the app at controlled small, medium, and tall terminal heights and verify region order, flexible middle sizing, and stable status/selection positioning.

### Tests for User Story 2

- [X] T023 [P] [US2] Add failing shell region-order assertions in `tests/unit/interactive/layout.test.ts`
- [X] T024 [P] [US2] Add failing tall-terminal flexible-height assertions in `tests/unit/interactive/layout.test.ts`
- [X] T025 [P] [US2] Add failing resize state-preservation assertions in `tests/unit/interactive/layout.test.ts`

### Implementation for User Story 2

- [X] T026 [US2] Read terminal row information with Ink stdout state in `src/cli/ink/app/App.tsx`
- [X] T027 [US2] Apply the fullscreen layout allocation from `ContextContent` to the shell regions in `src/cli/ink/app/App.tsx`
- [X] T028 [US2] Pass available context rows from the shell into `ContextContent` in `src/cli/ink/app/App.tsx`
- [X] T029 [US2] Ensure `SelectableList` accepts a shell-provided maximum visible row budget in `src/cli/ink/components/SelectableList.tsx`
- [X] T030 [US2] Verify User Story 2 with `npm test -- tests/unit/interactive/layout.test.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Preserve Selection Flow Under Limited Space (Priority: P2)

**Goal**: Small terminals remain usable, with concise context and visible selection controls or a clear minimum-size message.

**Independent Test**: Run the app at the smallest supported terminal height and below it, then verify concise context, visible selection controls, and minimum-size handling without layout overlap.

### Tests for User Story 3

- [X] T031 [P] [US3] Add failing small-terminal concise-content assertions in `tests/unit/interactive/layout.test.ts`
- [X] T032 [P] [US3] Add failing below-minimum terminal message assertions in `tests/unit/interactive/layout.test.ts`
- [X] T033 [P] [US3] Add failing focus-only read-only snapshot assertions for constrained navigation in `tests/integration/interactive-read-only.test.ts`

### Implementation for User Story 3

- [X] T034 [US3] Render the minimum-size message when terminal rows are below the supported threshold in `src/cli/ink/app/App.tsx`
- [X] T035 [US3] Reduce context content by priority when rows are constrained in `src/cli/ink/components/ContextContent.tsx`
- [X] T036 [US3] Preserve focused item and route state across constrained redraws in `src/cli/ink/app/App.tsx` and `src/cli/ink/components/SelectableList.tsx`
- [X] T037 [US3] Verify User Story 3 with `npm test -- tests/unit/interactive/layout.test.ts tests/integration/interactive-read-only.test.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature, clean up touched code, and align docs with the final behavior.

- [X] T038 [P] Update interactive app overview documentation for the fullscreen context area in `src/cli/ink/app/README.md`
- [X] T039 [P] Update screen overview documentation for context metadata expectations in `src/cli/ink/screens/README.md`
- [X] T040 Run quickstart validation commands from `specs/003-ink-content-area/quickstart.md`
- [X] T041 Run full quality checks with `npm run lint` and `npm test`
- [X] T042 Review all new and changed top-level functions, types, values, and fields for required multiline doc comments in `src/cli/ink/app/App.tsx`, `src/cli/ink/components/ContextContent.tsx`, and `src/cli/ink/components/SelectableList.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and can begin after shared context primitives exist; final shell integration should account for US1 context state.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US2 layout allocation.
- **Polish (Phase 6)**: Depends on desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on User Story 2 or 3.
- **User Story 2 (P1)**: Can start after Foundational; integrates cleanly with User Story 1 through `ContextContent`.
- **User Story 3 (P2)**: Can start after Foundational, but implementation is simplest after User Story 2 establishes row allocation.

### Within Each User Story

- Write the listed tests first and confirm they fail.
- Implement context models before screen metadata.
- Implement shell layout before terminal-size edge cases.
- Verify each story independently before moving to the next phase.

### Parallel Opportunities

- Setup review tasks T002 and T003 can run in parallel after T001 starts.
- Foundational tests T004 and T005 can run in parallel.
- User Story 1 test tasks T012, T013, and T014 can run in parallel.
- User Story 2 test tasks T023, T024, and T025 can run in parallel.
- User Story 3 test tasks T031, T032, and T033 can run in parallel.
- Documentation tasks T038 and T039 can run in parallel after implementation settles.

---

## Parallel Example: User Story 1

```text
Task: "T012 [P] [US1] Add failing main menu focus-context tests in tests/unit/interactive/screens/navigation-complete.test.ts"
Task: "T013 [P] [US1] Add failing task spec list focus-context assertions in tests/integration/interactive-browse.test.ts"
Task: "T014 [P] [US1] Add failing workflow and agent focus-context assertions in tests/integration/interactive-browse.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "T023 [P] [US2] Add failing shell region-order assertions in tests/unit/interactive/layout.test.ts"
Task: "T024 [P] [US2] Add failing tall-terminal flexible-height assertions in tests/unit/interactive/layout.test.ts"
Task: "T025 [P] [US2] Add failing resize state-preservation assertions in tests/unit/interactive/layout.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T031 [P] [US3] Add failing small-terminal concise-content assertions in tests/unit/interactive/layout.test.ts"
Task: "T032 [P] [US3] Add failing below-minimum terminal message assertions in tests/unit/interactive/layout.test.ts"
Task: "T033 [P] [US3] Add failing focus-only read-only snapshot assertions for constrained navigation in tests/integration/interactive-read-only.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for route and focused-option context updates.
3. Validate with the User Story 1 tests.
4. Stop and review the context model before adding fullscreen sizing.

### Incremental Delivery

1. Add shared context primitives and focus reporting.
2. Add User Story 1 context updates across primary navigation.
3. Add User Story 2 fullscreen row allocation and resize preservation.
4. Add User Story 3 constrained terminal behavior.
5. Run quickstart and full quality checks.

### Parallel Team Strategy

1. One developer owns shell/context primitives.
2. One developer owns screen context metadata after the shared model lands.
3. One developer owns terminal-size tests and constrained layout behavior.

## Notes

- [P] tasks use separate files or are safe to perform independently.
- [US1], [US2], and [US3] labels map directly to the prioritized user stories in `spec.md`.
- All implementation tasks include concrete file paths.
- Keep focus updates read-only; only explicit activation may run navigation or mutation flows.
- Preserve existing CLI parity from `specs/002-ink-interactive-cli`.
