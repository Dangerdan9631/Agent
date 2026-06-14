---
description: "Task list for Step Manifestos and Set Lists (feature 007)"
---

# Tasks: Step Manifestos and Set Lists

**Input**: Design documents from `specs/007-step-manifesto-setlists/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per FR-038 — lifecycle ordering, manifesto scope, hook instructions, set-list triage/priority/disabled, defaults, skill metadata, MCP/CLI parity.

**Organization**: Tasks grouped by user story (US1–US6) for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US6) on user-story phase tasks only
- Every task includes exact file path(s)

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Runtime config**: `.spec-n-roll/config/` per project

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create module scaffolds, templates, and test file stubs before foundational work.

- [X] T001 Create `src/manifesto/` module scaffold with `index.ts`, `paths.ts`, `validation.ts`, and `README.md` per plan.md structure
- [X] T002 [P] Create `src/setlists/` module scaffold with `index.ts`, `schema.ts`, `triage.ts`, and `README.md` per plan.md structure
- [X] T003 [P] Create manifesto init templates `src/templates/manifesto-global.md` and `src/templates/manifesto-step.md` with placeholder tokens per contracts/manifesto.md
- [X] T004 [P] Create `src/core/step-lifecycle.ts` stub exporting `runStepInit` and `runStepFinalize` function signatures and result types
- [X] T005 Extend project init in `src/cli/commands/init.ts` to seed `.spec-n-roll/config/set-lists.json`, create `manifesto/` directory layout, and copy manifesto templates
- [X] T006 [P] Add contract test stubs `tests/contract/step-lifecycle.test.ts`, `tests/contract/set-lists.test.ts`, `tests/contract/workflow-skills-metadata.test.ts` and integration stubs `tests/integration/step-lifecycle.test.ts`, `tests/integration/set-lists-triage.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schemas, persistence, hook normalization, migration, and completion gates that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement `SetList` and `SetListsFile` Zod schemas with validation rules in `src/setlists/schema.ts` per data-model.md
- [X] T008 [P] Extend workflow state schema with `lifecycle` object fields in `src/workflow/state.ts` per data-model.md Step Lifecycle Session
- [X] T009 Implement set list CRUD, atomic read/write, and validate helpers in `src/setlists/index.ts` targeting `.spec-n-roll/config/set-lists.json`
- [X] T010 [P] Seed default papercut/quick/full set lists as ordinary data entries in `src/setlists/index.ts` and `src/cli/commands/init.ts` with no runtime name branches
- [X] T011 Implement manifesto path helpers and atomic read/write in `src/manifesto/paths.ts` and `src/manifesto/index.ts`
- [X] T012 [P] Implement manifesto validation (non-empty body, unresolved placeholders, scope clarity) in `src/manifesto/validation.ts`
- [X] T013 Implement `collectHookInstructions()` and `StepHookInstruction` types in `src/extensions/hooks.ts` merging `.specify/extensions.yml` and workflow extension manifest hooks
- [X] T014 Add set-list migration on first read when `set-lists.json` is missing in `src/updates/migration.ts` per contracts/set-lists.md Migration section
- [X] T015 [P] Add finalize gate to `writeWorkflowState` in `src/core/workflow-state.ts` rejecting `lastCompletedStepId` updates without successful lifecycle finalize per FR-009
- [X] T016 [P] Extend `src/config/schema.ts` with exported lifecycle and set-list related types used by CLI/MCP adapters

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Deterministic Step Lifecycle (Priority: P1) 🎯 MVP

**Goal**: Agents call step init before work and step finalize after validation; MCP and CLI parity; lifecycle metadata enforced.

**Independent Test**: Start a workflow step via agent instructions, verify init is required before work, validate output, verify finalize is required before completion; reject completion without finalize (SC-001, SC-002).

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US1] Contract tests for init happy path, blocking active-step errors, and lifecycle metadata in `tests/contract/step-lifecycle.test.ts`
- [X] T018 [P] [US1] Contract tests for finalize without init rejection, validation failure, idempotent second finalize in `tests/contract/step-lifecycle.test.ts`
- [X] T019 [P] [US1] Integration tests for lifecycle ordering and completion rejection without finalize in `tests/integration/step-lifecycle.test.ts`

### Implementation for User Story 1

- [X] T020 [US1] Implement `runStepInit` in `src/core/step-lifecycle.ts` with step identity resolution, lifecycle `initAt` update, manifesto delegation, and before-hook collection
- [X] T021 [US1] Implement `runStepFinalize` in `src/core/step-lifecycle.ts` with init verification, validation gate, after-hook collection, and completion metadata per contracts/step-lifecycle.md
- [X] T022 [P] [US1] Add CLI command `step init` in `src/cli/commands/step-init.ts` delegating to `runStepInit` with JSON stdout
- [X] T023 [P] [US1] Add CLI command `step finalize` in `src/cli/commands/step-finalize.ts` delegating to `runStepFinalize` with JSON stdout
- [X] T024 [US1] Register step init/finalize subcommands in `src/cli/index.ts` under the `step` command group
- [X] T025 [P] [US1] Add MCP tools `step_init` and `step_finalize` in `src/mcp/tools.ts` delegating to core lifecycle functions
- [X] T026 [US1] Refactor `src/workflow/engine.ts` to integrate lifecycle boundaries and remove ad-hoc step completion writes for agent path
- [X] T027 [US1] Update `src/workflow/step-manifest.ts` for config-only step resolution used by lifecycle operations
- [X] T028 [US1] Update executable workflow step skills to require `step_init` before work and `step_finalize` before completion in `src/agents/generators/workflow-skills.ts` per FR-002 and FR-013
- [X] T029 [US1] Extend MCP/CLI parity contract tests for step lifecycle in `tests/contract/mcp-cli-parity.test.ts`

**Checkpoint**: User Story 1 fully functional — init/finalize enforce deterministic step boundaries independently.

---

## Phase 4: User Story 2 - Manifesto Management (Priority: P1)

**Goal**: Global and step-specific Spec Manifestos authored via `/spec-n-manifesto`; deterministic loading at init with scope labels.

**Independent Test**: Create global and step manifestos, run init for matching and non-matching steps; verify global always present, step manifesto only for exact step name match (SC-003, SC-005).

### Tests for User Story 2

- [X] T030 [P] [US2] Integration tests for manifesto scope (global always, step only on match) in `tests/integration/step-lifecycle.test.ts`
- [X] T031 [P] [US2] Contract tests for empty global diagnostic and orphan step manifesto behavior in `tests/contract/step-lifecycle.test.ts`

### Implementation for User Story 2

- [X] T032 [US2] Implement `readManifestosForStep(projectRoot, stepId)` with scope-labeled entries in `src/manifesto/index.ts` per contracts/manifesto.md
- [X] T033 [US2] Wire `readManifestosForStep` into `runStepInit` in `src/core/step-lifecycle.ts` with FR-020 scope labeling
- [X] T034 [US2] Add manifesto draft conflict detection against `.specify/memory/constitution.md` in `src/manifesto/validation.ts`
- [X] T035 [P] [US2] Add optional read-only CLI `manifesto show` in `src/cli/commands/manifesto-show.ts` and register in `src/cli/index.ts`
- [X] T036 [US2] Generate `/spec-n-manifesto` agent skill with single-target interview workflow in `src/agents/generators/workflow-skills.ts` per contracts/manifesto.md
- [X] T037 [P] [US2] Add Ink read-model `src/cli/ink/read-models/manifesto.ts` for global and step manifesto content
- [X] T038 [US2] Add read-only Ink manifesto view screen in `src/cli/ink/screens/manifesto/manifesto-view.tsx` and wire route in `src/cli/ink/app/navigation.ts`

**Checkpoint**: Manifestos authorable via skill; init loads correct scope deterministically.

---

## Phase 5: User Story 3 - Hook Instructions Around Steps (Priority: P1)

**Goal**: Step init returns before-hook instructions; step finalize returns after-hook instructions; disabled hooks omitted; invalid config is non-blocking diagnostic.

**Independent Test**: Configure enabled before/after hooks for one step; verify before hooks only in init, after hooks only in finalize (SC-004).

### Tests for User Story 3

- [X] T039 [P] [US3] Contract tests for hook phase separation, disabled hook omission, and mandatory hook labeling in `tests/contract/step-lifecycle.test.ts`

### Implementation for User Story 3

- [X] T040 [US3] Extend `collectHookInstructions()` in `src/extensions/hooks.ts` for step-scoped `before_{stepId}` and `after_{stepId}` from both hook sources per research.md
- [X] T041 [US3] Add unavailable command diagnostics and `mandatory` derivation to hook instruction payloads in `src/extensions/hooks.ts`
- [X] T042 [US3] Integrate before-hook collection into `runStepInit` and after-hook collection into `runStepFinalize` in `src/core/step-lifecycle.ts`
- [X] T043 [US3] Surface invalid/unreadable hook config as non-blocking `diagnostics` in `src/core/step-lifecycle.ts` without failing init/finalize

**Checkpoint**: Hook instructions returned in correct lifecycle phase with agent-call semantics.

---

## Phase 6: User Story 4 - Configurable Set Lists Replace Complexity Triage (Priority: P2)

**Goal**: Set lists replace hard-coded complexity triage; papercut/quick/full are data-only defaults; priority tie-break and disabled exclusion.

**Independent Test**: Disable a preconfigured set list, add custom higher-priority list, verify triage follows enabled state and priority not hard-coded names (SC-006, SC-007).

### Tests for User Story 4

- [X] T044 [P] [US4] Contract tests for default set lists on fresh init and disabled exclusion in `tests/contract/set-lists.test.ts`
- [X] T045 [P] [US4] Integration tests for priority tie-break, ambiguous selection, and migration from legacy config in `tests/integration/set-lists-triage.test.ts`

### Implementation for User Story 4

- [X] T046 [US4] Implement `evaluateSetListTriage` and `selectSetListByPriority` in `src/setlists/triage.ts` per contracts/set-lists.md Triage Rules
- [X] T047 [US4] Replace `WorkflowTierId` union and `assessTriage` heuristics by delegating to set-list triage in `src/specs/triage.ts`
- [X] T048 [US4] Update `src/specs/specify.ts` to use set list selection and set-list terminology instead of workflow tier union
- [X] T049 [US4] Remove hard-coded papercut/quick/full branches from `src/workflow/engine.ts` and `src/workflow/step-manifest.ts`
- [X] T050 [US4] Implement set-list validate ensuring at least one enabled entry and valid workflow references in `src/setlists/index.ts`
- [X] T051 [US4] Add blocking triage response when no enabled set lists remain in `src/setlists/triage.ts`

**Checkpoint**: Triage is fully config-driven with no runtime name branches on default set list ids.

---

## Phase 7: User Story 5 - Management Surfaces for Set Lists and Lifecycle (Priority: P2)

**Goal**: CLI, MCP, and Ink expose consistent set-list CRUD, triage, and lifecycle operations with shared validation.

**Independent Test**: Create/update set list via CLI, read via MCP, edit via Ink; all surfaces show same state (SC-008).

### Tests for User Story 5

- [X] T052 [P] [US5] Contract tests for set-list CLI commands (list/show/create/update/enable/disable/remove/validate) in `tests/contract/set-lists.test.ts`
- [X] T053 [P] [US5] Extend MCP/CLI parity matrix for set lists and optional triage CLI in `tests/contract/mcp-cli-parity.test.ts`

### Implementation for User Story 5

- [X] T054 [US5] Implement full set-list CLI command group in `src/cli/commands/set-list.ts` per contracts/set-lists.md CLI Commands table
- [X] T055 [US5] Register set-list subcommands in `src/cli/index.ts`
- [X] T056 [P] [US5] Add MCP tools `set_list_read` and `set_list_triage` in `src/mcp/tools.ts` per contracts/set-lists.md
- [X] T057 [US5] Add Ink read-model for set lists in `src/cli/ink/read-models/set-lists.ts`
- [X] T058 [P] [US5] Add Ink set-lists list screen in `src/cli/ink/screens/set-lists/set-lists-list.tsx`
- [X] T059 [P] [US5] Add Ink set-list detail screen in `src/cli/ink/screens/set-lists/set-list-detail.tsx`
- [X] T060 [US5] Add Ink set-list edit screen with shared validation in `src/cli/ink/screens/set-lists/set-list-edit.tsx`
- [X] T061 [US5] Wire set-list Ink routes in `src/cli/ink/app/navigation.ts` and `src/cli/ink/app/App.tsx`
- [X] T062 [US5] Rename user-facing complexity/workflow-variant labels to set list in `src/cli/ink/read-models/workflow-variants.ts` and related Ink screens

**Checkpoint**: All three surfaces operate set lists and lifecycle with consistent validation and state.

---

## Phase 8: User Story 6 - Agent Skill Metadata (Priority: P3)

**Goal**: Every Spec-n-Roll-managed skill carries `author: spec-n-roll` and current toolkit `version` after refresh; user-owned skills untouched.

**Independent Test**: Refresh agent skills and verify managed skills contain author and version metadata (SC-009).

### Tests for User Story 6

- [X] T063 [P] [US6] Contract tests for managed skill metadata refresh and user-skill non-overwrite in `tests/contract/workflow-skills-metadata.test.ts`

### Implementation for User Story 6

- [X] T064 [US6] Inject `metadata.author: spec-n-roll` and `metadata.version` from `readToolkitPackageVersion()` in `src/agents/generators/workflow-skills.ts` for all managed skills
- [X] T065 [US6] Restrict metadata refresh to `listWorkflowSkillUpdates()` managed manifest only in `src/cli/commands/update.ts` per FR-035
- [X] T066 [US6] Ensure `spec-n-manifesto` and all workflow step skills include consistent frontmatter metadata block in `src/agents/generators/workflow-skills.ts`

**Checkpoint**: Managed skills traceable to Spec-n-Roll and toolkit version; user skills preserved.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, terminology cleanup, migration guidance, and full validation.

- [X] T067 [P] Add multiline doc comments to all new top-level exports in `src/manifesto/`, `src/setlists/`, and `src/core/step-lifecycle.ts` per FR-037
- [X] T068 [P] Finalize `src/manifesto/README.md` and `src/setlists/README.md` describing module responsibilities per constitution Principle I
- [X] T069 Add set-list and lifecycle migration guidance for legacy complexity terminology in `docs/updates-and-migrations.md` per FR-032
- [X] T070 [P] Audit and replace remaining user-facing complexity/workflow-variant strings outside migration docs across `src/cli/` and `src/cli/ink/` per SC-010
- [X] T071 Run quickstart validation scenarios 1–10 from `specs/007-step-manifesto-setlists/quickstart.md`
- [X] T072 Run full `npm test` suite and resolve regressions in `tests/contract/` and `tests/integration/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–8)**: All depend on Foundational completion
  - US1 (Phase 3): Start immediately after Foundational — **MVP**
  - US2 (Phase 4): Depends on manifesto module (Foundational) + US1 init wiring for integration tests
  - US3 (Phase 5): Depends on US1 lifecycle core + Foundational hook collection
  - US4 (Phase 6): Depends on Foundational set-list module; independent of US1 for core triage logic
  - US5 (Phase 7): Depends on US4 set-list core + US1 lifecycle CLI/MCP patterns
  - US6 (Phase 8): Depends on US1 skill instruction updates; can parallel US5 after US1
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Priority | Depends On | Independent Test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | Init/finalize ordering and completion gate |
| US2 | P1 | Foundational, US1 init integration | Manifesto scope at init |
| US3 | P1 | Foundational, US1 lifecycle | Hook phase separation |
| US4 | P2 | Foundational | Default lists, priority, disabled |
| US5 | P2 | US4, US1 | CLI/MCP/Ink round-trip |
| US6 | P3 | US1 skill patterns | Managed skill metadata |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core library before CLI/MCP adapters
- CLI/MCP before Ink screens
- Story checkpoint before next priority

### Parallel Opportunities

- Phase 1: T002, T003, T004, T006 in parallel after T001
- Phase 2: T008, T010, T012, T015, T016 in parallel where marked [P]
- After Foundational: US4 triage work can parallel US1 lifecycle if staffed separately (different modules)
- Within each story: all [P] test tasks can run in parallel
- US5 Ink screens T058, T059 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch US1 contract/integration tests together:
Task T017: tests/contract/step-lifecycle.test.ts (init scenarios)
Task T018: tests/contract/step-lifecycle.test.ts (finalize scenarios)
Task T019: tests/integration/step-lifecycle.test.ts (ordering)

# Launch US1 CLI/MCP adapters in parallel after T020–T021:
Task T022: src/cli/commands/step-init.ts
Task T023: src/cli/commands/step-finalize.ts
Task T025: src/mcp/tools.ts (step_init, step_finalize)
```

---

## Parallel Example: User Story 4

```bash
# Tests in parallel:
Task T044: tests/contract/set-lists.test.ts (defaults, disabled)
Task T045: tests/integration/set-lists-triage.test.ts (priority, migration)

# After T046 triage core, engine refactor (T049) can proceed while specify.ts (T048) updates in parallel if coordinated
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T016) — **CRITICAL**
3. Complete Phase 3: User Story 1 (T017–T029)
4. **STOP and VALIDATE**: Run quickstart scenarios 1–2; confirm SC-001 and SC-002
5. Demo deterministic step lifecycle via MCP and CLI

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready
2. US1 → MVP: deterministic init/finalize lifecycle
3. US2 + US3 → manifestos and hook instructions (complete P1 stories)
4. US4 → config-driven set lists replace complexity triage
5. US5 → full management surfaces (CLI/MCP/Ink parity)
6. US6 → skill metadata provenance
7. Polish → migration docs, terminology audit, full test suite

### Parallel Team Strategy

With multiple developers after Foundational:

- **Developer A**: US1 lifecycle core + CLI/MCP (Phase 3)
- **Developer B**: US2 manifesto + US3 hooks (Phases 4–5, after US1 init exists)
- **Developer C**: US4 set-list triage + US5 surfaces (Phases 6–7)
- **Developer D**: US6 skill metadata (Phase 8, after US1 skill pattern)

---

## Notes

- [P] tasks = different files, no incomplete-task dependencies
- [Story] label maps task to user story for traceability
- Each user story is independently testable at its checkpoint
- Verify tests fail before implementing
- Commit after each task or logical group
- No runtime branches on `papercut`, `quick`, or `full` except init seed data and tests (FR-027)
