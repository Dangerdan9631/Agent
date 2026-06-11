---

description: "Task list for Spec-n-Roll Toolkit implementation"
---

# Tasks: Spec-n-Roll Toolkit

**Input**: Design documents from `specs/001-spec-n-roll-toolkit/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | research.md ✅ | quickstart.md ✅ | contracts/ ✅

**Tests**: Included — TDD is explicitly required per plan.md ("behavior-first TDD: one observable workflow behavior at a time") and US7 in spec.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1–US10); omitted for Setup, Foundational, and Polish phases
- Exact source file paths per `src/` structure in plan.md

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize TypeScript project with all tooling before any implementation begins.

- [x] T001 Initialize package.json with name `spec-n-roll`, TypeScript, and npm scripts (build, test, lint, prepublish) in project root
- [x] T002 [P] Configure tsconfig.json targeting Node20 ESM with strict mode and paths for src/ in project root
- [x] T003 [P] Install primary dependencies: ink, react, commander, zod, yaml, fs-extra, semver, @cucumber/cucumber, @types/node in package.json
- [x] T004 [P] Configure Vitest in vitest.config.ts targeting tests/unit/ and tests/integration/ with fixture support
- [x] T005 [P] Configure Cucumber runner in cucumber.mjs targeting tests/features/ and tests/step-definitions/
- [x] T006 [P] Configure ESLint (eslint.config.js) and Prettier (.prettierrc) for TypeScript/TSX source
- [x] T007 Create src/ directory skeleton per plan.md: cli/, workflow/, specs/, living-specs/, agents/, extensions/, updates/, config/, docs/
- [x] T008 [P] Create tests/ directory skeleton: features/, step-definitions/, integration/, contract/, fixtures/, unit/

**Checkpoint**: Project builds, lints, and test runner initializes with zero test files.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schemas, infrastructure, and CLI dispatcher that MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Define Zod schemas for all config file shapes in src/config/schema.ts (WorkflowConfig, WorkflowVariant, WorkflowStep, AgentConfig, schemaVersion)
- [ ] T010 [P] Define Zod schemas for workflow-state.json in src/workflow/state.ts (taskSpecId, slug, workflowVariantId, lastCompletedStepId, currentStepId, status: active|paused|complete, updatedAt)
- [ ] T011 [P] Define Zod schemas for project-metadata.json in src/workflow/state.ts (schemaVersion, nextTaskSpecId, currentTaskSpecId, currentTaskSlug, implementationStartedAt, updatedAt)
- [ ] T012 Implement file ownership classification in src/updates/ownership.ts (toolkit-owned: .spec-n-roll/ except config/, .agents/; user-owned: .spec-n-roll/config/, specs/, living-specs/)
- [ ] T013 [P] Implement built-in step output manifest in src/workflow/step-manifest.ts (specify→spec.md, plan→plan.md, tasks→tasks.md, implement→tier-dependent)
- [ ] T014 [P] Implement tier-aware artifact detection in src/workflow/artifacts.ts (reads workflow variant from state to know which files are expected)
- [ ] T015 Implement workflow state read/write with atomic file operations in src/workflow/state.ts (updatedAt timestamp on every write)
- [ ] T016 [P] Implement project metadata read/write in src/workflow/artifacts.ts (nextTaskSpecId counter increment on new task spec creation)
- [ ] T017 Implement CLI entry point with Commander command registration skeleton in src/cli/index.ts (routes to init, update, config, version subcommands)
- [ ] T018 Implement global/local CLI dispatcher in src/cli/dispatcher.ts (walk cwd→parents for .spec-n-roll/cli/bin/spec-n-roll; delegate unless --global; error if local found but unexecutable)
- [ ] T019 [P] Define extension manifest Zod schema in src/extensions/manifest.ts (id, manifestVersion, targetToolkitVersion, entrypoint, steps[], hooks[], workflowVariants[])
- [ ] T020 [P] Implement .bak backup writer in src/updates/backup.ts (write {file}.bak if toolkit-owned file is locally modified before overwrite; report each conflict)
- [ ] T021 [P] Create fixture directory layout in tests/fixtures/ (empty project, initialized project, multi-spec project templates)

**Checkpoint**: Schemas compile, dispatcher logic unit-tests pass, fixtures exist — user story implementation can begin.

---

## Phase 3: User Story 1 — Multi-Agent Project Initialization (Priority: P1) 🎯 MVP

**Goal**: Developer runs `spec-n-roll init`, selects agents, and all agent rules/skills/workflow commands are ready in every selected agent environment.

**Independent Test**: Run `spec-n-roll init .` in a fixture directory, select cursor and claude-code, verify `.agents/skills/`, `.spec-n-roll/AGENTS.md`, per-agent pointer files, `workflow.config.json` with three tier variants, `project-metadata.json` with `nextTaskSpecId: 1`, and local CLI copy.

### Tests for User Story 1

> **Write these tests FIRST — they must FAIL before implementation begins**

- [ ] T022 [P] [US1] Write failing integration test for multi-agent init in tests/integration/init.test.ts (two agents → skills, rules, pointer files, workflow config, project-metadata all created correctly)
- [ ] T023 [P] [US1] Write failing unit test for `workflow.config.json` default content in tests/unit/workflow-config.test.ts (papercut/quick/full each reference shared specify step as step 1)

### Implementation for User Story 1

- [ ] T024 [P] [US1] Implement cursor bundled extension agent generator in src/agents/generators/cursor.ts (outputs .cursor/rules/spec-n-roll.mdc pointing to .spec-n-roll/AGENTS.md + skill files in .agents/skills/)
- [ ] T025 [P] [US1] Implement claude-code bundled extension agent generator in src/agents/generators/claude-code.ts (CLAUDE.md pointer + .agents/skills/)
- [ ] T026 [P] [US1] Implement copilot bundled extension agent generator in src/agents/generators/copilot.ts (.github/copilot-instructions.md pointer + .agents/skills/)
- [ ] T027 [P] [US1] Implement codex bundled extension agent generator in src/agents/generators/codex.ts (AGENTS.md pointer + .agents/skills/)
- [ ] T028 [US1] Implement canonical AGENTS.md writer in src/agents/generators/agents-md.ts (toolkit-owned .spec-n-roll/AGENTS.md with workflow command reference)
- [ ] T029 [US1] Implement extension loader for bundled extensions in src/agents/extension-loader.ts (discovers .spec-n-roll/bundled-extensions/{id}/, validates manifest, returns available extensions)
- [ ] T030 [US1] Implement Ink multi-select prompt for agent selection in src/cli/ink/init-prompts.tsx
- [ ] T031 [US1] Implement default workflow.config.json writer in src/cli/commands/init.ts (papercut: specify→implement; quick: specify→tasks→implement; full: specify→plan→tasks→implement; shared step refs, nextTaskSpecId: 1)
- [ ] T032 [US1] Implement `spec-n-roll init [path]` command orchestration in src/cli/commands/init.ts (prompts → agent generators → config files → local CLI copy install)
- [ ] T033 [US1] Install local CLI copy to .spec-n-roll/cli/bin/spec-n-roll (+ spec-n-roll.cmd on Windows) during init in src/cli/commands/init.ts

**Checkpoint**: `spec-n-roll init .` with two agents produces all expected files and T022/T023 pass.

---

## Phase 4: User Story 2 — Platform-Agnostic Script Execution via CLI (Priority: P1)

**Goal**: All automation invoked by workflow steps runs as TypeScript CLI modules — no shell spawning, no platform detection, no per-platform script variant configuration. Cross-platform reliability is guaranteed by the Node.js runtime.

**Independent Test**: Run a workflow step that invokes a built-in CLI script module against the initialized-project fixture on Windows and on macOS — identical behavior and zero platform-specific configuration required.

### Tests for User Story 2

- [ ] T034 [P] [US2] Write failing integration test for platform-agnostic CLI script invocation in tests/integration/cli-scripts.test.ts (workflow automation module executes using only Node.js APIs; no shell spawning; identical behavior on Windows and Unix platform fixtures)

### Implementation for User Story 2

- [ ] T035 [P] [US2] Define TypeScript script module interface in src/cli/scripts/index.ts (ScriptModule type: export default async handler; enforces no child_process spawn or exec for built-in operations)
- [ ] T036 [US2] Implement built-in workflow automation as TypeScript script modules in src/cli/scripts/ (file I/O, directory setup, config writes — all via Node.js fs/path APIs; one module per logical operation)
- [ ] T037 [US2] Integrate script module invocation into workflow engine in src/workflow/engine.ts (import() script modules directly; never spawn a shell for built-in operations)

**Checkpoint**: CLI script integration test passes against both Windows and Unix platform fixtures; no child_process.spawn/exec calls exist in src/cli/scripts/ or for built-in workflow operations.

---

## Phase 5: User Story 3 — Interactive Specification via Iterative Questioning (Priority: P1)

**Goal**: `/spec-n-specify <description>` creates a task spec directory, runs triage (tier selection), then conducts a one-question-at-a-time interview resulting in a complete spec.md with YAML frontmatter and workflow-state.json.

**Independent Test**: Pass a vague one-sentence description → triage proposes a tier with rationale → confirm → interview asks one targeted question with recommended answer → resolved questions not re-asked → spec.md with `status: Active`, no unresolved placeholders → workflow-state.json with numeric taskSpecId and required slug.

### Tests for User Story 3

- [ ] T039 [P] [US3] Write failing integration test for /spec-n-specify in tests/integration/specify.test.ts (triage→confirm→interview→spec.md created with correct frontmatter, workflow-state.json with taskSpecId+slug)
- [ ] T040 [P] [US3] Write failing unit test for triage heuristic in tests/unit/triage.test.ts (single-file→papercut, new behavior→quick, cross-cutting→full, ambiguous→manual picker)

### Implementation for User Story 3

- [ ] T041 [US3] Implement triage heuristic (papercut/quick/full classification) with rationale output in src/specs/triage.ts
- [ ] T042 [US3] Implement one-question-at-a-time interview engine in src/specs/interview.ts (ranks ambiguities, asks one, records answer, does not re-ask resolved, explores codebase before asking)
- [ ] T043 [US3] Implement task spec directory creation with auto-assigned taskSpecId from nextTaskSpecId and kebab-case slug derivation in src/specs/specify.ts
- [ ] T044 [US3] Implement spec.md writer with YAML frontmatter (status: Active, taskSpecId, slug) in src/specs/specify.ts
- [ ] T045 [US3] Implement workflow state writer for specify step (taskSpecId, slug, workflowVariantId, lastCompletedStepId: specify) in src/specs/specify.ts
- [ ] T046 [P] [US3] Implement /spec-n-clarify step handler with separate follow-up interview for existing task spec in src/specs/clarify.ts
- [ ] T047 [US3] Implement spec quality checker (no unresolved placeholder markers, critical questions answered) in src/specs/quality.ts
- [ ] T048 [US3] Generate /spec-n-specify and /spec-n-clarify skill files for all configured agents in src/agents/generators/ (reads agent configs from workflow.config.json)

**Checkpoint**: /spec-n-specify integration test passes; triage unit tests pass; task spec dirs created with correct structure.

---

## Phase 6: User Story 4 — Complexity-Based Workflow Triage and Zero-Knowledge Continuation (Priority: P2)

**Goal**: `/spec-n-roll` reads workflow state, advances to next incomplete tier step automatically. Detects partial artifacts with restart/cancel/force-clean prompt. Multiple Active specs → numbered-list prompt.

**Independent Test**: Three feature descriptions of clearly different complexity each route to papercut/quick/full after confirmation. Running `/spec-n-roll` repeatedly on a mid-workflow project advances through each remaining tier step in order.

### Tests for User Story 4

- [ ] T049 [P] [US4] Write failing integration test for /spec-n-roll advancement in tests/integration/roll.test.ts (state read → next step executed; missing state → artifact fallback; partial artifacts → three-choice prompt)
- [ ] T050 [P] [US4] Write failing unit test for intent detection in tests/unit/roll-intent.test.ts (description arg→specify, zero Active→prompt, Active specs→numbered list, ambiguous→"new or continue?")

### Implementation for User Story 4

- [ ] T051 [US4] Implement workflow engine state-based next-step resolver in src/workflow/engine.ts (reads workflowVariantId, lastCompletedStepId → returns next step ID per variant steps array)
- [ ] T052 [US4] Implement /spec-n-roll intent detection in src/workflow/engine.ts (description arg→specify; no description + zero Active→prompt for description; Active specs→numbered task list; ambiguous→"new or continue?")
- [ ] T053 [US4] Implement partial artifact detection in src/workflow/engine.ts using src/workflow/step-manifest.ts (any expected file exists + step not complete in state → partial)
- [ ] T054 [US4] Implement restart/cancel/force-clean three-choice Ink prompt in src/cli/ink/partial-recovery-prompt.tsx (one prompt covers all partial files for the step)
- [ ] T055 [P] [US4] Implement state/artifact conflict detection and single confirmation prompt in src/workflow/engine.ts (state wins when parseable; warn + confirm before proceeding)
- [ ] T056 [P] [US4] Implement /spec-n-analyze step handler producing non-destructive cross-artifact report in src/specs/quality.ts (gaps, contradictions, checklist failures across spec, plan, tasks, living-specs)
- [ ] T057 [US4] Generate /spec-n-roll, /spec-n-plan, /spec-n-tasks, /spec-n-analyze, /spec-n-implement skill files for all configured agents in src/agents/generators/
- [ ] T058 [US4] Implement /spec-n-plan step handler (prompts for plan.md creation per full tier) in src/specs/ and wire into workflow engine

**Checkpoint**: /spec-n-roll integration test passes; advancement, partial artifact recovery, and multi-spec selection all work.

---

## Phase 7: User Story 6 — Three-State Task Spec Lifecycle (Priority: P2)

**Goal**: Task spec `status` in spec.md frontmatter progresses Active→Complete→Locked. Locked specs are immutable. Only one Active spec may be in implement at a time.

**Independent Test**: Complete a workflow → status: Complete. Start non-specify step on a different task spec → prior spec locks. Attempt to write to Locked spec directory → rejected with clear error.

### Tests for User Story 6

- [ ] T059 [P] [US6] Write failing unit tests for lifecycle state transitions in tests/unit/lifecycle.test.ts (implement-complete→Complete, non-specify-start→Complete-specs-lock, clarify-revert→Active, locked-write→rejected)

### Implementation for User Story 6

- [ ] T060 [P] [US6] Implement spec.md YAML frontmatter reader and writer (status: Active|Complete|Locked) in src/specs/specify.ts
- [ ] T061 [US6] Implement automatic Complete transition in src/workflow/engine.ts (set status: Complete in spec.md frontmatter when final workflow step for the variant completes)
- [ ] T062 [US6] Implement locking of eligible Complete specs in src/workflow/engine.ts (when any task spec begins a step beyond specify, transition all Complete specs to Locked)
- [ ] T063 [US6] Implement write protection for Locked task spec directories in src/updates/ownership.ts (check spec.md status before any write; throw clear error on Locked)
- [ ] T064 [US6] Implement "only one Active spec in implement" guard in src/workflow/engine.ts (reject implement if currentTaskSpecId already set in project-metadata.json and different)
- [ ] T065 [US6] Implement /spec-n-clarify revert in src/specs/clarify.ts (when new un-implemented requirements are appended to a Complete spec, set status: Active in frontmatter)

**Checkpoint**: Lifecycle unit tests pass; lifecycle enforcement integrates with workflow engine without breaking Phase 3–6 tests.

---

## Phase 8: User Story 5 — Living Specification Maintenance (Priority: P2)

**Goal**: Living specs in `living-specs/{kebab-domain}.feature` are created/updated at implementation entry before any test or production code. Scenarios tagged with additive `@spec-n-roll-{id}` tags. Deprecated scenarios removed (not archived).

**Independent Test**: After three feature cycles, living spec files accurately describe all delivered behaviors. Scenarios are tagged with the correct task IDs.

### Tests for User Story 5

- [ ] T066 [P] [US5] Write failing integration test for living spec operations in tests/integration/living-specs.test.ts (create new, update existing, additive tags preserved, deprecated removed)
- [ ] T067 [P] [US5] Write failing unit test for domain routing in tests/unit/gherkin-routing.test.ts (semantic domain inferred from description → correct {kebab-domain}.feature path)

### Implementation for User Story 5

- [ ] T068 [P] [US5] Implement Gherkin file reader and scenario parser in src/living-specs/gherkin.ts (parse .feature files, return scenario list with existing tags)
- [ ] T069 [US5] Implement domain inference and target feature file routing in src/living-specs/gherkin.ts (semantic domain from feature description → living-specs/{kebab-case-domain}.feature; create if absent)
- [ ] T070 [US5] Implement additive task tag application to new/modified scenarios in src/living-specs/tags.ts (append @spec-n-roll-{taskSpecId}; preserve all prior tags; never remove)
- [ ] T071 [US5] Implement deprecated scenario removal from living spec files in src/living-specs/gherkin.ts (delete scenario block; version control is the archive)
- [ ] T072 [US5] Integrate living spec update as first action in /spec-n-implement entry in src/specs/implement.ts (update living-specs/ before any test or production code writes)

**Checkpoint**: Living spec integration tests pass; tags are additive; domain routing is correct.

---

## Phase 9: User Story 7 — TDD Cucumber Test Suite Workflow (Priority: P2)

**Goal**: Implementation begins with failing Cucumber tests (red) from living spec `.feature` files. Stub step definitions generated for unmapped steps. Test status tracked through red→green→refactor.

**Independent Test**: `/spec-n-implement` for a feature with living spec scenarios: failing test suite exists before any production code. After implementation, all tests pass. Tests use public interface only.

### Tests for User Story 7

- [ ] T073 [P] [US7] Write failing integration test for TDD cycle entry in tests/integration/tdd-cycle.test.ts (Cucumber runs against living-specs/ feature files; stub step defs generated for unmapped steps; tests fail before code)

### Implementation for User Story 7

- [ ] T074 [US7] Implement Cucumber test runner invocation in src/specs/implement.ts (runs against living-specs/*.feature directly; step defs from tests/step-definitions/)
- [ ] T075 [US7] Implement stub step definition generator in src/living-specs/step-stubs.ts (for each unmapped Gherkin step: generate stub in tests/step-definitions/ with "// STUB: requires implementation" comment; clearly marked)
- [ ] T076 [US7] Implement test status tracker in src/specs/implement.ts (records pass/fail per scenario; guides red→green→refactor cycle; reports progress to developer)
- [ ] T077 [P] [US7] Enforce pre-code red gate in src/specs/implement.ts (fail the implement step with a clear message if all tests pass before any production code changes — indicates living specs were not updated)
- [ ] T078 [US7] Complete /spec-n-implement step handler integration in src/specs/implement.ts (living spec update → Cucumber red → code → green → refactor → mark step complete in workflow-state.json)

**Checkpoint**: TDD cycle integration test passes; stub generation works; red gate enforced.

---

## Phase 10: User Story 9 — CLI-Based Toolkit Setup, Update, and Configuration (Priority: P2)

**Goal**: Developer manages spec-n-roll installation entirely via CLI. `init`, `update`, `config add-agent`, and `version` commands work with Ink interactive prompts.

**Independent Test**: Run `spec-n-roll init`, then `spec-n-roll update`, then `spec-n-roll config add-agent` — all user-owned files preserved; toolkit-owned files updated; new agent files generated without breaking existing ones.

### Tests for User Story 9

- [ ] T079 [P] [US9] Write failing integration test for update command in tests/integration/update.test.ts (toolkit-owned files overwritten; user-owned files preserved byte-identical; .bak written for modified toolkit-owned)

### Implementation for User Story 9

- [ ] T080 [US9] Implement `spec-n-roll update [--dry-run]` command Ink UI in src/cli/commands/update.ts (show current/target versions, toolkit-owned diff, .bak conflicts list, migration plan, extension warnings; require confirm for breaking migrations)
- [ ] T081 [US9] Implement toolkit-owned file update logic in src/cli/commands/update.ts (overwrite toolkit-owned files; call src/updates/backup.ts for locally modified ones)
- [ ] T082 [US9] Implement `spec-n-roll config add-agent` command in src/cli/commands/config-add-agent.ts (Ink agent select → run agent generators → update workflow.config.json; preserve existing agent config)
- [ ] T083 [P] [US9] Implement `spec-n-roll version` command in src/cli/commands/version.ts (report global installed version, local project version if present, latest available from registry)
- [ ] T084 [US9] Implement remaining agent skill file generation for all workflow commands (/spec-n-plan, /spec-n-tasks, /spec-n-implement, /spec-n-roll, /spec-n-analyze) in src/agents/generators/

**Checkpoint**: Update and config integration tests pass; version command works; add-agent does not break existing configs.

---

## Phase 11: User Story 10 — Versioned Toolkit with Safe Update Model (Priority: P2)

**Goal**: Config schema migrations happen only at update time. Extension compatibility warnings never block. Locally modified toolkit-owned files get `.bak` copies. Schema version embedded in all config files.

**Independent Test**: Initialize with older schema → run update → configs migrated; user-owned files byte-identical; toolkit-owned file with local change has `.bak`; extension with wrong targetToolkitVersion shows warning but update completes.

### Tests for User Story 10

- [ ] T085 [P] [US10] Write failing unit tests for config migration in tests/unit/migration.test.ts (tolerant reader parses v1 config; migrates to v2; breaking migration requires confirmation; non-breaking is automatic)
- [ ] T086 [P] [US10] Write failing unit test for extension compatibility in tests/unit/compatibility.test.ts (mismatch detected from compatibility.json → warning in update summary; execution not blocked)

### Implementation for User Story 10

- [ ] T087 [P] [US10] Implement semver toolkit version field validation in src/config/schema.ts (add toolkitVersion: semver string to config schema)
- [ ] T088 [US10] Implement additive-only tolerant config reader in src/config/reader.ts (reads any prior schema version without failure; ignores unknown fields; maps old field names to new)
- [ ] T089 [US10] Implement config schema migration logic in src/updates/migration.ts (detect schemaVersion delta; apply incremental migrations; write back migrated configs; require confirmation for breaking changes)
- [ ] T090 [US10] Implement extension compatibility checker in src/extensions/compatibility.ts (load .spec-n-roll/compatibility.json; compare targetToolkitVersion in each extension manifest; surface mismatches as warnings only)
- [ ] T091 [P] [US10] Write initial .spec-n-roll/compatibility.json with schema structure in bundled toolkit files (empty incompatibleCombinations array initially)
- [ ] T092 [US10] Integrate migration and compatibility into update command in src/cli/commands/update.ts (migration.ts runs on all user-owned config files; compatibility.ts runs on all installed extensions; warnings in update summary)

**Checkpoint**: Migration and compatibility unit tests pass; update command properly executes schema migrations and reports compatibility warnings.

---

## Phase 12: User Story 8 — Extensible and Configurable Workflow Definitions (Priority: P3)

**Goal**: Custom extension steps replace built-in steps via in-process Node `import()`. Workflow variants defined in config. Multiple extensions targeting same phase resolved by priority. Disabled extensions fall back to built-in.

**Independent Test**: Register extension that replaces built-in triage within specify. Run /spec-n-specify → extension handler invoked instead of built-in. Disable extension → built-in behavior restored. Two variants share same built-in `tasks` and `implement` step references without duplication.

### Tests for User Story 8

- [ ] T093 [P] [US8] Write failing contract test for extension step invocation in tests/contract/extension-step.test.ts (extension handler loaded via import(); invoked instead of built-in; disabled→built-in used)
- [ ] T094 [P] [US8] Write failing unit test for workflow variant loading in tests/unit/workflow-variants.test.ts (papercut/quick/full loaded from config; shared step references not duplicated)

### Implementation for User Story 8

- [ ] T095 [P] [US8] Implement extension manifest Zod validation in src/extensions/manifest.ts (validate entrypoint path is project-relative, steps[], hooks[], workflowVariants[] all conform to schema)
- [ ] T096 [P] [US8] Implement in-process extension handler invocation via Node import() in src/extensions/hooks.ts (dynamic import of entrypoint module; invoke exported async handler; propagate errors as step failure with remediation guidance)
- [ ] T097 [US8] Implement workflow step priority resolution in src/workflow/engine.ts (when multiple enabled extensions target same step phase, sort by priority, use highest; inform developer of active step)
- [ ] T098 [US8] Implement disabled extension fallback in src/workflow/engine.ts (if all extensions for a phase are disabled, use built-in handler; never error on disabled extension)
- [ ] T099 [US8] Implement workflow variant loading from workflow.config.json in src/workflow/engine.ts (named variants each list step references; steps are shared definitions not duplicates)
- [ ] T100 [P] [US8] Implement hook event dispatching for before/after each step in src/extensions/hooks.ts (before_specify, after_specify, before_plan, after_plan, before_tasks, after_tasks, before_implement, after_implement, before_clarify, after_clarify, before_analyze, after_analyze)
- [ ] T101 [US8] Validate bundled extension manifests (cursor, claude-code, copilot, codex) against contracts/extension-manifest.schema.json in tests/contract/bundled-extensions.test.ts

**Checkpoint**: Extension contract tests pass; custom step replaces built-in; disabled fallback works; priority resolution is deterministic.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, end-to-end validation, and final integration verification.

- [ ] T102 Write docs/workflow.md covering all tier steps, triage embedding in specify, tier variant shapes, workflow state machine, artifact detection, and partial recovery choices
- [ ] T103 [P] Write docs/cli.md covering init, update, config add-agent, version, --global flag, and global/local dispatch behavior
- [ ] T104 [P] Write docs/multi-agent.md covering bundled agent setup, adding a new agent post-init, and switching between agents
- [ ] T105 [P] Write docs/cli-script-execution.md covering CLI-based built-in script execution, platform-agnostic behavior, and how to extend or replace built-in scripts via extensions
- [ ] T106 Write docs/extension-quickstart.md (quick-start guide: create manifest, register extension, run workflow with custom step)
- [ ] T107 [P] Write docs/extension-reference.md (manifest schema reference, hook event shapes, step handler contract, compatibility declarations, semver guarantees)
- [ ] T108 [P] Write docs/extension-example.md (fully worked example: custom triage logic replacing built-in triage within specify)
- [ ] T109 [P] Write docs/updates-and-migrations.md (file ownership classification, .bak backups, schema migration process, compatibility warnings, --dry-run usage)
- [ ] T110 Run all quickstart.md validation scenarios (Scenarios 1–11) against fixture projects in tests/integration/ and confirm expected outcomes

**Checkpoint**: All quickstart scenarios pass; documentation covers every requirement from SC-008 without requiring source file inspection.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — 🎯 MVP starting point
- **US2 (Phase 4)**: Depends on Foundational — can run in parallel with US1
- **US3 (Phase 5)**: Depends on US1 (agent skill generation infrastructure)
- **US4 (Phase 6)**: Depends on US3 (specify step exists; workflow state written after specify)
- **US6 (Phase 7)**: Depends on US4 (workflow engine advancement triggers locking)
- **US5 (Phase 8)**: Depends on US3 (taskSpecId used for tags) and US4 (implement entry point)
- **US7 (Phase 9)**: Depends on US5 (living specs are Cucumber source) and US4 (implement step)
- **US9 (Phase 10)**: Depends on US1 (agent generators) and Foundational (backup, ownership)
- **US10 (Phase 11)**: Depends on US9 (update command exists) and Foundational (schemas, reader)
- **US8 (Phase 12)**: Depends on US4 (workflow engine exists and dispatches steps)
- **Polish (Phase 13)**: Depends on all user stories complete

### User Story Independence

- **US1 (P1)** — No story dependencies. Can start after Foundational.
- **US2 (P1)** — No story dependencies. Parallel with US1.
- **US3 (P1)** — Depends on US1 (agent generators in place).
- **US4 (P2)** — Depends on US3 (specify step exists, workflow-state.json populated).
- **US6 (P2)** — Depends on US4 (workflow engine; locking triggered by non-specify steps).
- **US5 (P2)** — Depends on US3 (taskSpecId) and US4 (implement entry). Independent of US6.
- **US7 (P2)** — Depends on US5 (living specs) and US4 (implement step).
- **US9 (P2)** — Depends on US1 (agent generators). Partially independent of US3–US7.
- **US10 (P2)** — Depends on US9 (update command). Partially independent of US3–US8.
- **US8 (P3)** — Depends on US4 (workflow engine dispatches steps).

### Within Each User Story

- Test tasks MUST be written and confirmed FAILING before implementation tasks begin
- Within each story: Tests → Schemas/models → Core logic → Integration → Skill generation
- Complete each story's checkpoint before beginning next story

### Parallel Opportunities

- All Phase 1 [P] tasks can run in parallel
- All Phase 2 [P] tasks can run in parallel within the foundational phase
- US1 and US2 can run in parallel after Foundational completes
- US5, US9 can run in parallel with US4 implementation (different file areas)
- US10 can start immediately after US9's update command skeleton exists
- All [P]-labeled tasks within each story can run in parallel

---

## Parallel Example: User Story 1

```text
# After T021 (fixtures ready), start in parallel:
Task T024: cursor bundled extension generator in src/agents/generators/cursor.ts
Task T025: claude-code generator in src/agents/generators/claude-code.ts
Task T026: copilot generator in src/agents/generators/copilot.ts
Task T027: codex generator in src/agents/generators/codex.ts

# After all generators complete, sequentially:
Task T028: AGENTS.md writer (depends on knowing all agent targets)
Task T029: extension-loader.ts (discovers bundled extensions)
Task T030: init-prompts.tsx (selects among loaded extensions)
Task T031: default workflow.config.json writer
Task T032: init command orchestration (assembles all of above)
Task T033: local CLI copy installer
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 only — P1 stories)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Multi-Agent Init (🎯 core differentiator)
4. Complete Phase 4: US2 — Script Execution
5. Complete Phase 5: US3 — Interactive Specification
6. **STOP and VALIDATE**: Three P1 stories independently testable
7. Developer can initialize a project, select agents, run `/spec-n-specify`, and get a complete spec across all agent environments

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 → Multi-agent init works end-to-end → **Demo: multi-agent project**
3. US2 → Scripts run cross-platform → **Demo: Windows + macOS same project**
4. US3 → Spec creation works interactively → **Demo: complete spec from one sentence**
5. US4 → `/spec-n-roll` advances automatically → **Demo: hands-off workflow progression**
6. US6 → Lifecycle enforced → **Demo: audit trail + locking**
7. US5 + US7 → Living specs + TDD → **Demo: behavior-driven full cycle**
8. US9 + US10 → Safe updates → **Demo: update without data loss**
9. US8 → Custom extensions → **Demo: replace triage with custom logic**
10. Polish → Documentation complete → **Release candidate**

### Parallel Team Strategy

With multiple developers:

1. Complete Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (agent generators + init)
   - Developer B: US2 (CLI script modules + cross-platform integration)
3. Once US1 is done, Developer A moves to US3 (specify); Developer B moves to US4 once US3 is done
4. US9 and US10 can be a separate track once US1 is done
5. US8 (extensions) is independent track once US4 workflow engine exists

---

## Notes

- [P] tasks use different files with no dependency on incomplete tasks — safe to parallelize
- [USn] label traces each task to its user story for traceability and independent validation
- TDD tasks marked as tests are REQUIRED per plan.md — write and confirm FAILING before implementation
- Each story phase should be independently completable and validatable without implementing later stories
- The `/spec-n-implement` step (US4/US5/US7) is the most complex and touches the most files — treat it as its own vertical slice
- Behavior tests target public interfaces (CLI commands, workflow-state.json, spec.md output) — never internal module APIs
- Commit after each task or logical group; use `- [ ]` checkbox to track completion
- The only Active task spec in the implement phase at a time (enforced in US6); plan accordingly
