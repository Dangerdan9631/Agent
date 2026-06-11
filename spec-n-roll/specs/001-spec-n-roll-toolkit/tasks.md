---

description: "Task list for Spec-n-Roll Toolkit implementation"
---

# Tasks: Spec-n-Roll Toolkit

**Input**: Design documents from `specs/001-spec-n-roll-toolkit/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | research.md ✅ | quickstart.md ✅ | contracts/ ✅

**Tests**: Included — TDD is explicitly required per plan.md ("behavior-first TDD: one observable workflow behavior at a time") and US7 in spec.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Revised**: 2026-06-10 — inline phase documentation tasks (docs match implemented behavior + TODO for pending features); triple-binary build packaging (T009), FR-009 living-spec-first `tasks.md` template rules, SC-009 non-interactive `--yes` flags; plus dispatcher/MCP/core library, agent MCP config, and platform script auto-selection (no `scriptVariants` config or `config script-variants` command).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1–US10); omitted for Setup, Foundational, and Polish phases
- Exact source file paths per `src/` structure in plan.md

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize TypeScript project with all tooling before any implementation begins.

- [x] T001 Initialize package.json with name `spec-n-roll`, TypeScript, and npm scripts (build, test, lint, prepublish) in project root
- [x] T002 [P] Configure tsconfig.json targeting Node20 ESM with strict mode and paths for src/ in project root
- [x] T003 [P] Install primary dependencies: ink, react, commander, zod, yaml, fs-extra, semver, @modelcontextprotocol/sdk, @cucumber/cucumber, @types/node in package.json
- [x] T004 [P] Configure Vitest in vitest.config.ts targeting tests/unit/ and tests/integration/ with fixture support
- [x] T005 [P] Configure Cucumber runner in cucumber.mjs targeting tests/features/ and tests/step-definitions/
- [x] T006 [P] Configure ESLint (eslint.config.js) and Prettier (.prettierrc) for TypeScript/TSX source
- [x] T007 Create src/ directory skeleton per plan.md: cli/, mcp/, core/, workflow/, specs/, living-specs/, agents/, extensions/, updates/, config/, templates/ (toolkit docs live in repository root `docs/`, not under `src/`)
- [x] T008 [P] Create tests/ directory skeleton: features/, step-definitions/, integration/, contract/, fixtures/, unit/
- [x] T009 Configure triple-binary npm build outputs in package.json (bin entries for dispatcher, full CLI, and MCP server; build script compiling src/cli/dispatcher.ts, src/cli/index.ts, and src/mcp/server.ts; prepublish copies spec-n-roll.cmd and spec-n-roll-mcp.cmd Windows wrappers per plan.md)

**Checkpoint**: `npm run build` produces three distinct binaries; project lints and test runner initializes. (T001 scripts are superseded by T009 for FR-023/FR-030 packaging.)

### Documentation (Phase 1)

- [x] T010 [P] Update docs/cli.md to document implemented Phase 1 behavior (triple-binary packaging, bin entries, build/prepublish script, Windows wrappers in dist/cli/); use explicit TODO sections for unimplemented subcommands, flags, and MCP tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schemas, shared core library, MCP/CLI mutation surface, dispatcher, and ownership rules that MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T011 Define Zod schemas for all config file shapes in src/config/schema.ts (WorkflowConfig, WorkflowVariant, WorkflowStep, AgentConfig, schemaVersion)
- [x] T012 [P] Define Zod schemas for workflow-state.json in src/workflow/state.ts (taskSpecId, slug, workflowVariantId, lastCompletedStepId, currentStepId, status: active|paused|complete, updatedAt)
- [x] T013 [P] Define Zod schemas for project-metadata.json in src/config/schema.ts (schemaVersion, nextTaskSpecId, currentTaskSpecId, currentTaskSlug, implementationStartedAt, updatedAt)
- [x] T014 Implement file ownership classification in src/updates/ownership.ts (toolkit-owned: .spec-n-roll/ except config/, .agents/; user-owned: .spec-n-roll/config/, specs/, living-specs/)
- [x] T015 [P] Implement built-in step output manifest in src/workflow/step-manifest.ts (specify→spec.md, plan→plan.md, tasks→tasks.md; tier-aware expectations)
- [x] T016 [P] Implement tier-aware artifact detection in src/workflow/artifacts.ts (reads workflow variant from state to know which files are expected)
- [x] T017 Implement workflow state read/write with atomic file operations in src/core/workflow-state.ts (sole writer for workflow-state.json; updatedAt on every write)
- [x] T018 [P] Implement project metadata read/write in src/core/project-metadata.ts (nextTaskSpecId counter increment; current implementation task fields)
- [x] T019 [P] Implement spec.md YAML frontmatter read/write in src/core/frontmatter.ts (non-status fields; status delegated to task-lifecycle)
- [x] T020 [P] Implement tasks.md checkbox toggle in src/core/task-checkboxes.ts (parse and update completion checkboxes by task ID)
- [x] T021 [P] Implement step output template instantiation in src/core/templates.ts (copy src/templates/{stepId}.md → specs/{id}-{slug}/; accept frontmatter args)
- [x] T022 Implement task spec lifecycle status transitions in src/core/task-lifecycle.ts (Active|Complete|Locked via spec.md frontmatter; Locked write guard)
- [x] T023 [P] Create toolkit-owned step output templates with inline fill instructions in src/templates/spec.md, src/templates/plan.md, and src/templates/tasks.md (tasks.md template MUST include Living Specification Updates as the first implementation phase before test/code tasks per FR-009; plan.md template MUST include a Living Spec Targets section per FR-008)
- [x] T024 Implement CLI entry point with Commander registration in src/cli/index.ts (init, update, config, version, and core-library subcommands per contracts/cli-commands.md)
- [x] T025 Implement global/local CLI dispatcher in src/cli/dispatcher.ts (walk cwd→parents for .spec-n-roll/cli/bin/spec-n-roll; exec child process; forward -v/--version unchanged; --global bypass; fail clearly if local exec fails)
- [x] T026 [P] Define extension manifest Zod schema in src/extensions/manifest.ts (id, manifestVersion, targetToolkitVersion, entrypoint, steps[], hooks[], workflowVariants[], agentSetup.mcpConfig)
- [x] T027 [P] Implement .bak backup writer in src/updates/backup.ts (write {file}.bak if toolkit-owned file is locally modified before overwrite; report each conflict)
- [x] T028 Implement MCP stdio server skeleton in src/mcp/server.ts (@modelcontextprotocol/sdk; register tools from contracts/mcp-tools.md delegating to src/core/)
- [x] T029 [P] Wire non-interactive CLI core subcommands in src/cli/commands/ (workflow state, task status, project metadata, task checkbox, step instantiate, spec frontmatter — each invokes matching src/core/ operation)
- [x] T030 [P] Write failing contract test skeleton for MCP/CLI parity in tests/contract/mcp-cli-parity.test.ts (one mutation exercised via CLI and MCP with identical file outcome)
- [x] T031 [P] Create fixture directory layout in tests/fixtures/ (empty project, initialized project, multi-spec project, pre-existing agent MCP config templates)

**Checkpoint**: T009 build outputs exist; schemas compile; core library mutations work via CLI subcommands; MCP server starts; dispatcher unit-tests pass; parity contract test exists and fails — user story implementation can begin.

### Documentation (Phase 2)

- [x] T032 [P] Update docs/updates-and-migrations.md to document implemented file ownership classification and excluded toolkit docs (match src/updates/ownership.ts); TODO for .bak backup, migration, and update command flows
- [x] T033 [P] Update docs/cli.md to document implemented dispatcher delegation, global CLI exec fallback, and MCP server skeleton (match src/cli/dispatcher.ts, src/mcp/server.ts); document implemented core-library subcommands only; TODO for remaining tools per contracts/mcp-tools.md

---

## Phase 3: User Story 1 — Multi-Agent Project Initialization (Priority: P1) 🎯 MVP

**Goal**: Developer runs `spec-n-roll init`, selects agents, and all agent rules/skills/workflow commands plus project-local MCP configuration are ready in every selected agent environment.

**Independent Test**: Run `spec-n-roll init .` in a fixture directory, select cursor and claude-code, verify `.agents/skills/`, `.spec-n-roll/AGENTS.md`, per-agent pointer files, each agent's project-local MCP config pointing at `.spec-n-roll/cli/bin/spec-n-roll-mcp`, `workflow.config.json` with three tier variants, `project-metadata.json` with `nextTaskSpecId: 1`, and version-matched full CLI + MCP binaries installed locally.

### Tests for User Story 1

> **Write these tests FIRST — they must FAIL before implementation begins**

- [x] T034 [P] [US1] Write failing integration test for multi-agent init in tests/integration/init.test.ts (two agents → skills, rules, pointer files, MCP config merge, workflow config, project-metadata, CLI + MCP binaries)
- [x] T035 [P] [US1] Write failing unit test for default workflow.config.json in tests/unit/workflow-config.test.ts (papercut/quick/full each reference shared specify step as step 1)
- [x] T036 [P] [US1] Write failing contract test for agent MCP config merge in tests/contract/agent-mcp-config.test.ts (upsert spec-n-roll serverId; preserve unrelated MCP servers; idempotent re-run)

### Implementation for User Story 1

- [x] T037 [P] [US1] Implement cursor bundled extension manifest and generator in src/agents/generators/cursor.ts (agentSetup.mcpConfig targets .cursor/mcp.json; rules pointer to .spec-n-roll/AGENTS.md; skills in .agents/skills/)
- [x] T038 [P] [US1] Implement claude-code bundled extension manifest and generator in src/agents/generators/claude-code.ts (CLAUDE.md pointer + MCP config per manifest)
- [x] T039 [P] [US1] Implement copilot bundled extension manifest and generator in src/agents/generators/copilot.ts (extension id `copilot`; .github/copilot-instructions.md pointer + MCP config per manifest)
- [x] T040 [P] [US1] Implement codex bundled extension manifest and generator in src/agents/generators/codex.ts (AGENTS.md pointer + MCP config per manifest)
- [x] T041 [US1] Implement canonical AGENTS.md writer in src/agents/generators/agents-md.ts (toolkit-owned .spec-n-roll/AGENTS.md with workflow command and MCP tool reference)
- [x] T042 [US1] Implement extension loader for bundled extensions in src/agents/extension-loader.ts (discovers .spec-n-roll/bundled-extensions/{id}/; validates manifest including agentSetup.mcpConfig)
- [x] T043 [US1] Implement MCP config format adapters and idempotent merge in src/agents/mcp-config.ts (read/upsert/write per contracts/agent-mcp-config.md; bundled adapters for cursor, claude-code, copilot, codex)
- [x] T044 [US1] Implement Ink multi-select prompts for agent selection in src/cli/ink/init-prompts.tsx (skipped when `--yes` supplies `--agents`)
- [x] T045 [US1] Implement default workflow.config.json writer in src/cli/commands/init.ts (papercut: specify→implement; quick: specify→tasks→implement; full: specify→plan→tasks→implement; bundled agent ids cursor/claude-code/copilot/codex; nextTaskSpecId: 1)
- [x] T046 [US1] Install full CLI and MCP binaries to .spec-n-roll/cli/bin/ during init in src/cli/commands/init.ts (copy from T009 build outputs: spec-n-roll + spec-n-roll-mcp; .cmd wrappers on Windows; version-matched pair)
- [x] T047 [US1] Implement `spec-n-roll init [path] [--yes]` command orchestration in src/cli/commands/init.ts (Ink prompts or `--yes` with `--agents` → agent generators → MCP config merge → config files → bundled-extensions copy → script install; copies built binaries from T009)

**Checkpoint**: `spec-n-roll init .` with two agents produces all expected files, MCP configs reference local MCP binary, and T034–T036 pass.

### Documentation (US1)

- [x] T048 [P] Update docs/multi-agent.md and docs/cli.md init sections to match implemented init behavior (agent generators, MCP config merge, workflow.config.json, binary install); TODO for unimplemented init flags and edge cases

---

## Phase 4: User Story 2 — Platform-Appropriate Script Execution (Priority: P1)

**Goal**: Automation scripts run in the correct platform form (`.ps1` on Windows, `.sh` on macOS/Linux) via runtime platform detection, with clear errors when the required shell runtime is missing.

**Independent Test**: After `init`, on Windows a workflow step runs the `.ps1` script; on macOS the same project runs the `.sh` script without configuration changes.

### Tests for User Story 2

- [x] T049 [P] [US2] Write failing integration test for platform script selection in tests/integration/platform-scripts.test.ts (Windows fixture → .ps1; Unix fixture → .sh; missing runtime → clear error with remediation)
- [x] T050 [P] [US2] Write failing unit test for platform script selection in tests/unit/platform-scripts.test.ts (Windows → `.ps1`; Unix → `.sh`; missing runtime → clear error with remediation)

### Implementation for User Story 2

- [x] T051 [US2] Implement platform script selector in src/workflow/platform-scripts.ts (detect platform; select `.ps1` or `.sh` from `.spec-n-roll/scripts/`; fail with remediation when runtime missing)
- [x] T052 [P] [US2] Bundle and install paired .sh and .ps1 automation scripts to .spec-n-roll/scripts/ during init in src/cli/commands/init.ts (one logical operation per script pair)
- [x] T053 [US2] Integrate platform script execution into workflow engine in src/workflow/engine.ts (invoke correct `.spec-n-roll/scripts/` script for current platform; never spawn wrong platform script)

**Checkpoint**: Platform script integration tests pass on Windows and Unix fixtures; missing-runtime errors are actionable.

### Documentation (US2)

- [x] T054 [P] Update docs/platform-scripts.md to match implemented platform auto-selection and `.spec-n-roll/scripts/` install behavior; TODO for unimplemented missing-runtime remediation details

---

## Phase 5: User Story 3 — Interactive Specification via Iterative Questioning (Priority: P1)

**Goal**: `/spec-n-specify <description>` creates a task spec directory, runs embedded triage (tier selection), instantiates `spec.md` via MCP/CLI, then conducts a one-question-at-a-time interview resulting in complete prose and machine-readable state written only through core library/MCP.

**Independent Test**: Pass a vague one-sentence description → triage proposes tier with rationale → confirm → `step_output_instantiate` creates spec.md → interview asks one targeted question with recommended answer → spec.md has `status: Active` via MCP/CLI → workflow-state.json has numeric taskSpecId and required slug.

### Tests for User Story 3

- [x] T055 [P] [US3] Write failing integration test for /spec-n-specify in tests/integration/specify.test.ts (triage→instantiate→interview→spec.md frontmatter via core; workflow-state.json via core)
- [x] T056 [P] [US3] Write failing unit test for triage heuristic in tests/unit/triage.test.ts (single-file→papercut, new behavior→quick, cross-cutting→full, ambiguous→manual picker with defaultWorkflowId pre-select)

### Implementation for User Story 3

- [x] T057 [US3] Implement triage heuristic (papercut/quick/full classification) with rationale output in src/specs/triage.ts (embedded at start of specify; persist workflowVariantId before interview)
- [x] T058 [US3] Implement one-question-at-a-time interview engine in src/specs/interview.ts (ranks ambiguities, asks one, records answer, does not re-ask resolved, explores codebase before asking)
- [x] T059 [US3] Implement task spec directory creation with auto-assigned taskSpecId from nextTaskSpecId and kebab-case slug derivation in src/specs/specify.ts (via src/core/project-metadata.ts)
- [x] T060 [US3] Integrate step_output_instantiate before interview prose edits in src/specs/specify.ts (call src/core/templates.ts; set status: Active via src/core/task-lifecycle.ts)
- [x] T061 [US3] Implement workflow state writer for specify step completion in src/specs/specify.ts (via src/core/workflow-state.ts: taskSpecId, slug, workflowVariantId, lastCompletedStepId: specify)
- [x] T062 [P] [US3] Implement /spec-n-clarify step handler with separate follow-up interview for existing task spec in src/specs/clarify.ts (revert Complete→Active when new un-implemented requirements added)
- [x] T063 [US3] Implement spec quality checker (no unresolved placeholder markers, critical questions answered) in src/specs/quality.ts
- [x] T064 [US3] Generate /spec-n-specify and /spec-n-clarify skill files documenting MCP instantiate + prose edit workflow in src/agents/generators/ (route machine-readable writes to MCP tools)

**Checkpoint**: /spec-n-specify integration test passes; triage unit tests pass; template instantiation precedes prose edits.

### Documentation (US3)

- [x] T065 [P] Update docs/workflow.md specify/triage/clarify sections to match implemented behavior (template instantiation, interview flow, MCP/CLI mutation boundaries); TODO for unimplemented analyze and roll flows

---

## Phase 6: User Story 4 — Complexity-Based Workflow Triage and Zero-Knowledge Continuation (Priority: P2)

**Goal**: `/spec-n-roll` reads workflow state, advances to next incomplete tier step automatically. Detects partial artifacts with restart/cancel/force-clean prompt. Multiple Active specs → numbered-list prompt.

**Independent Test**: Three feature descriptions of clearly different complexity each route to papercut/quick/full after confirmation. Running `/spec-n-roll` repeatedly on a mid-workflow project advances through each remaining tier step in order.

### Tests for User Story 4

- [ ] T066 [P] [US4] Write failing integration test for /spec-n-roll advancement in tests/integration/roll.test.ts (state read → next step executed; missing state → tier-aware artifact fallback; partial artifacts → three-choice prompt)
- [ ] T067 [P] [US4] Write failing unit test for intent detection in tests/unit/roll-intent.test.ts (description arg→specify, zero Active→prompt, Active specs→numbered list, ambiguous→"new or continue?")
- [ ] T068 [P] [US4] Write failing unit test for FR-009 tasks-step template rules in tests/unit/tasks-template.test.ts (src/templates/tasks.md mandates living-spec update as first implementation task group; plan.md template includes living-spec targets section)

### Implementation for User Story 4

- [ ] T069 [US4] Implement workflow engine state-based next-step resolver in src/workflow/engine.ts (reads workflowVariantId, lastCompletedStepId → returns next step ID per variant steps array; skip on-demand clarify/analyze)
- [ ] T070 [US4] Implement /spec-n-roll intent detection in src/workflow/engine.ts (description arg→specify; no description + zero Active→prompt for description; Active specs→numbered task list; ambiguous→"new or continue?")
- [ ] T071 [US4] Implement partial artifact detection in src/workflow/engine.ts using src/workflow/step-manifest.ts (any expected file exists + step not complete in state → partial)
- [ ] T072 [US4] Implement restart/cancel/force-clean three-choice Ink prompt in src/cli/ink/partial-recovery-prompt.tsx (one prompt covers all partial files for the step; paused status via core)
- [ ] T073 [P] [US4] Implement state/artifact conflict detection and single confirmation prompt in src/workflow/engine.ts (state wins when parseable; warn + confirm before proceeding)
- [ ] T074 [P] [US4] Implement /spec-n-analyze step handler producing non-destructive cross-artifact report in src/specs/quality.ts (gaps, contradictions, checklist failures across spec, plan, tasks, living-specs)
- [ ] T075 [US4] Implement /spec-n-plan and /spec-n-tasks step handlers in src/specs/plan.ts and src/specs/tasks.ts (instantiate plan.md/tasks.md via core before agent prose edits; plan.md documents living-spec targets; tasks.md first implementation phase lists living-spec updates before test/code tasks per FR-009; tier-skipped steps omitted)
- [ ] T076 [US4] Generate /spec-n-roll, /spec-n-plan, /spec-n-tasks, /spec-n-analyze, /spec-n-implement skill files for all configured agents in src/agents/generators/ (`/spec-n-tasks` skill MUST require living-spec updates as first task(s) per FR-009; reference MCP instantiate + prose edit workflow)

**Checkpoint**: /spec-n-roll integration test passes; FR-009 tasks-template test (T068) passes; advancement, partial artifact recovery, and multi-spec selection all work.

### Documentation (US4)

- [ ] T077 [P] Update docs/workflow.md roll/plan/tasks/analyze sections to match implemented advancement, partial recovery, tier steps, and FR-009 living-spec-first tasks rules; TODO for unimplemented edge cases

---

## Phase 7: User Story 6 — Three-State Task Spec Lifecycle (Priority: P2)

**Goal**: Task spec `status` in spec.md frontmatter progresses Active→Complete→Locked via core library/MCP only. Locked specs are immutable. Only one Active spec may be in implement at a time.

**Independent Test**: Complete a workflow → status: Complete. Start non-specify step on a different task spec → prior Complete specs lock. Attempt to write to Locked spec directory → rejected with clear error.

### Tests for User Story 6

- [ ] T078 [P] [US6] Write failing unit tests for lifecycle state transitions in tests/unit/lifecycle.test.ts (implement-complete→Complete, non-specify-start→Complete-specs-lock, clarify-revert→Active, locked-write→rejected)

### Implementation for User Story 6

- [ ] T079 [US6] Integrate automatic Complete transition in src/workflow/engine.ts (src/core/task-lifecycle.ts sets status: Complete when final tier step completes)
- [ ] T080 [US6] Implement locking of eligible Complete specs in src/workflow/engine.ts (when any task spec begins a step beyond specify, transition all Complete specs to Locked via core)
- [ ] T081 [US6] Enforce write protection for Locked task spec directories in src/core/task-lifecycle.ts and src/updates/ownership.ts (reject machine-readable and prose writes with clear error)
- [ ] T082 [US6] Implement "only one Active spec in implement" guard in src/workflow/engine.ts (validate/set currentTaskSpecId in project-metadata when implement begins; reject second concurrent implement)
- [ ] T083 [US6] Wire /spec-n-clarify Complete→Active revert in src/specs/clarify.ts (via src/core/task-lifecycle.ts when new un-implemented requirements appended)

**Checkpoint**: Lifecycle unit tests pass; lifecycle enforcement integrates with workflow engine and MCP tools.

### Documentation (US6)

- [ ] T084 [P] Update docs/workflow.md lifecycle section (Active→Complete→Locked, single implement guard) to match implemented behavior; TODO for clarify-revert nuances not yet shipped

---

## Phase 8: User Story 5 — Living Specification Maintenance (Priority: P2)

**Goal**: Living specs in `living-specs/{kebab-domain}.feature` are created/updated at implementation entry before any test or production code. Scenarios tagged with additive `@spec-n-roll-{id}` tags. Deprecated scenarios removed (not archived). Living specs remain agent-managed — outside MCP/CLI.

**Independent Test**: After three feature cycles, living spec files accurately describe all delivered behaviors. Scenarios are tagged with the correct task IDs.

### Tests for User Story 5

- [ ] T085 [P] [US5] Write failing integration test for living spec operations in tests/integration/living-specs.test.ts (create new, update existing, additive tags preserved, deprecated removed)
- [ ] T086 [P] [US5] Write failing unit test for domain routing in tests/unit/gherkin-routing.test.ts (semantic domain inferred from description → correct {kebab-domain}.feature path)

### Implementation for User Story 5

- [ ] T087 [P] [US5] Implement Gherkin file reader and scenario parser in src/living-specs/gherkin.ts (parse .feature files, return scenario list with existing tags)
- [ ] T088 [US5] Implement domain inference and target feature file routing in src/living-specs/gherkin.ts (semantic domain from feature description → living-specs/{kebab-case-domain}.feature; create if absent)
- [ ] T089 [US5] Implement additive task tag application to new/modified scenarios in src/living-specs/tags.ts (append @spec-n-roll-{taskSpecId}; preserve all prior tags; never remove)
- [ ] T090 [US5] Implement deprecated scenario removal from living spec files in src/living-specs/gherkin.ts (delete scenario block; version control is the archive)
- [ ] T091 [US5] Integrate living spec update as first action in /spec-n-implement entry in src/specs/implement.ts (update living-specs/ before any test or production code writes; planned targets documented in plan.md and listed as first task(s) in task-spec tasks.md per FR-009)

**Checkpoint**: Living spec integration tests pass; tags are additive; domain routing is correct.

### Documentation (US5)

- [ ] T092 [P] Update docs/workflow.md living-spec sections to match implemented Gherkin routing, tagging, and implementation-entry updates; TODO for deprecated-scenario removal if not complete

---

## Phase 9: User Story 7 — TDD Cucumber Test Suite Workflow (Priority: P2)

**Goal**: Implementation begins with failing Cucumber tests (red) from living spec `.feature` files. Stub step definitions generated for unmapped steps. Test status tracked through red→green→refactor.

**Independent Test**: `/spec-n-implement` for a feature with living spec scenarios: failing test suite exists before any production code. After implementation, all tests pass. Tests use public interface only.

### Tests for User Story 7

- [ ] T093 [P] [US7] Write failing integration test for TDD cycle entry in tests/integration/tdd-cycle.test.ts (Cucumber runs against living-specs/ feature files; stub step defs generated; tests fail before code)

### Implementation for User Story 7

- [ ] T094 [US7] Implement Cucumber test runner invocation in src/specs/implement.ts (runs against living-specs/*.feature directly; step defs from project test location)
- [ ] T095 [US7] Implement stub step definition generator in src/living-specs/step-stubs.ts (for each unmapped Gherkin step: generate stub with "// STUB: requires implementation" comment; clearly marked)
- [ ] T096 [US7] Implement test status tracker in src/specs/implement.ts (records pass/fail per scenario; guides red→green→refactor cycle; reports progress to developer)
- [ ] T097 [P] [US7] Enforce pre-code red gate in src/specs/implement.ts (fail implement step with clear message if all tests pass before production code changes)
- [ ] T098 [US7] Complete /spec-n-implement step handler in src/specs/implement.ts (living spec update → Cucumber red → code → green → refactor → mark step complete via src/core/workflow-state.ts)

**Checkpoint**: TDD cycle integration test passes; stub generation works; red gate enforced.

### Documentation (US7)

- [ ] T099 [P] Update docs/workflow.md TDD/Cucumber sections to match implemented red→green→refactor entry behavior; TODO for refactor guidance and reporting gaps

---

## Phase 10: User Story 9 — CLI-Based Toolkit Setup, Update, and Configuration (Priority: P2)

**Goal**: Developer manages spec-n-roll installation entirely via CLI — interactively (Ink) or non-interactively (`--yes` flags per SC-009). `init`, `update`, `config add-agent`, and `version` work without manual file editing. Dispatcher exec's local full CLI; update refreshes agent MCP config paths.

**Independent Test**: Run `spec-n-roll init --yes`, `spec-n-roll update --yes`, and `spec-n-roll config add-agent --yes --agent <id>` with no Ink prompts and no manual file edits (SC-009). User-owned files preserved on update; MCP config paths refreshed; new agent MCP merge does not break existing agents.

### Tests for User Story 9

- [ ] T100 [P] [US9] Write failing integration test for update command in tests/integration/update.test.ts (toolkit-owned files overwritten; user-owned preserved; .bak for modified toolkit-owned; MCP config paths refreshed)
- [ ] T101 [P] [US9] Write failing integration test for dispatcher local exec in tests/integration/dispatcher.test.ts (global dispatcher exec's local binary without in-process load; --global bypass; -v forwarded to full CLI combined report)
- [ ] T102 [P] [US9] Write failing integration test for config add-agent MCP merge in tests/integration/config-add-agent.test.ts (new agent only; existing agents unchanged; idempotent)
- [ ] T103 [P] [US9] Write failing integration test for non-interactive management commands in tests/integration/cli-non-interactive.test.ts (`init --yes`, `update --yes`, `config add-agent --yes --agent <id>` complete with zero Ink prompts and no manual file edits — SC-009)

### Implementation for User Story 9

- [ ] T104 [US9] Implement `spec-n-roll update [--dry-run] [--yes]` command in src/cli/commands/update.ts (Ink UI when interactive; skip prompts with `--yes`; versions, toolkit-owned diff, .bak conflicts, migrations, extension warnings, MCP refresh summary; require confirm for breaking migrations unless `--yes` with explicit `--confirm-migration`)
- [ ] T105 [US9] Implement toolkit-owned file update logic in src/cli/commands/update.ts (overwrite toolkit-owned including CLI + MCP binaries; call src/updates/backup.ts for locally modified files)
- [ ] T106 [US9] Refresh spec-n-roll MCP server paths in all configured agents during update in src/agents/mcp-config.ts (invoke from src/cli/commands/update.ts per contracts/agent-mcp-config.md)
- [ ] T107 [US9] Implement `spec-n-roll config add-agent` command in src/cli/commands/config-add-agent.ts (Ink agent select or `--yes` with `--agent` flags → generators → MCP config merge for new agent only; preserve existing agents)
- [ ] T108 [P] [US9] Implement `spec-n-roll version` combined report in src/cli/commands/version.ts (dispatcher version when applicable, executed binary version, local/global target, local path, latest available when discoverable)
- [ ] T110 [US9] Complete MCP/CLI parity contract tests in tests/contract/mcp-cli-parity.test.ts (all tools in contracts/mcp-tools.md have matching CLI subcommand with identical outcomes — SC-012)
- [ ] T111 [US9] Implement shared `--yes` non-interactive mode and CLI args for management commands in src/cli/commands/init.ts, src/cli/commands/update.ts, and src/cli/commands/config-add-agent.ts (`--yes` skips Ink; `init` accepts `--agents`; `config add-agent` accepts `--agent`; per contracts/cli-commands.md — SC-009)

**Checkpoint**: Update, dispatcher, add-agent, non-interactive (SC-009), and MCP/CLI parity tests pass.

### Documentation (US9)

- [ ] T112 [P] Update docs/cli.md management-command sections (update, config add-agent, version, --global, --yes) to match implemented behavior; TODO for flags not yet wired
- [ ] T113 [P] Update docs/updates-and-migrations.md update-flow section to match implemented toolkit-owned overwrite and MCP path refresh; TODO for dry-run and migration details pending US10

---

## Phase 11: User Story 10 — Versioned Toolkit with Safe Update Model (Priority: P2)

**Goal**: Config schema migrations happen only at update time. Extension compatibility warnings never block. Locally modified toolkit-owned files get `.bak` copies. compatibility.json refreshed on update.

**Independent Test**: Initialize with older schema → run update → configs migrated; user-owned files byte-identical; toolkit-owned file with local change has `.bak`; extension mismatch shows warning but update completes.

### Tests for User Story 10

- [ ] T114 [P] [US10] Write failing unit tests for config migration in tests/unit/migration.test.ts (tolerant reader parses v1 config; migrates to v2; breaking migration requires confirmation; non-breaking is automatic)
- [ ] T115 [P] [US10] Write failing unit test for extension compatibility in tests/unit/compatibility.test.ts (mismatch from compatibility.json → warning in update summary; execution not blocked)

### Implementation for User Story 10

- [ ] T116 [P] [US10] Implement semver toolkit version field validation in src/config/schema.ts (toolkitVersion: semver string in config schema)
- [ ] T117 [US10] Implement additive-only tolerant config reader in src/config/reader.ts (reads any prior schema version; ignores unknown fields; maps old field names)
- [ ] T118 [US10] Implement config schema migration logic in src/updates/migration.ts (detect schemaVersion delta; incremental migrations; write back; require confirmation for breaking changes)
- [ ] T119 [US10] Implement extension compatibility checker in src/extensions/compatibility.ts (load .spec-n-roll/compatibility.json; compare targetToolkitVersion; warnings only)
- [ ] T120 [P] [US10] Bundle initial .spec-n-roll/compatibility.json in toolkit install files (empty incompatibleCombinations array; refreshed on every update)
- [ ] T121 [US10] Integrate migration and compatibility into update command in src/cli/commands/update.ts (migration on all user-owned configs; compatibility check on extensions; warnings in summary)

**Checkpoint**: Migration and compatibility unit tests pass; update executes schema migrations and reports compatibility warnings.

### Documentation (US10)

- [ ] T122 [P] Update docs/updates-and-migrations.md migration and compatibility sections to match implemented schema migration and compatibility.json warnings; TODO only where behavior is still stubbed

---

## Phase 12: User Story 8 — Extensible and Configurable Workflow Definitions (Priority: P3)

**Goal**: Custom extension steps replace built-in steps via in-process Node `import()`. Workflow variants defined in config. Dynamic `before_{stepId}`/`after_{stepId}` hooks with unknown stepId warn-and-skip. No before_update/after_update hooks.

**Independent Test**: Register extension that replaces built-in triage within specify. Run /spec-n-specify → extension handler invoked. Disable extension → built-in restored. Two variants share same built-in step references.

### Tests for User Story 8

- [ ] T123 [P] [US8] Write failing contract test for extension step invocation in tests/contract/extension-step.test.ts (extension handler via import(); invoked instead of built-in; disabled→built-in)
- [ ] T124 [P] [US8] Write failing unit test for workflow variant loading in tests/unit/workflow-variants.test.ts (papercut/quick/full from config; shared step references not duplicated; unknown hook stepId warns and skips)

### Implementation for User Story 8

- [ ] T125 [P] [US8] Implement extension manifest Zod validation in src/extensions/manifest.ts (entrypoint, steps[], hooks[] pattern before_{stepId}/after_{stepId}, agentSetup; reject before_update/after_update)
- [ ] T126 [P] [US8] Implement in-process extension handler invocation via Node import() in src/extensions/hooks.ts (dynamic import; invoke exported handler; fail step with remediation on error)
- [ ] T127 [US8] Implement workflow step priority resolution in src/workflow/engine.ts (multiple extensions per stepId → highest priority wins; inform developer of active handler)
- [ ] T128 [US8] Implement disabled extension fallback in src/workflow/engine.ts (all disabled for stepId → built-in handler)
- [ ] T129 [US8] Implement workflow variant loading from workflow.config.json in src/workflow/engine.ts (named variants; shared step definitions by reference)
- [ ] T130 [P] [US8] Implement dynamic hook dispatch in src/extensions/hooks.ts (parse before_{stepId}/after_{stepId}; merged step registry at load; warn and skip unknown stepIds)
- [ ] T131 [US8] Validate bundled extension manifests against contracts/extension-manifest.schema.json in tests/contract/bundled-extensions.test.ts

**Checkpoint**: Extension contract tests pass; custom step replaces built-in; disabled fallback works.

### Documentation (US8)

- [ ] T132 [P] Update docs/extension-quickstart.md, docs/extension-reference.md, and docs/extension-example.md to match implemented extension manifest, hook dispatch, and custom step replacement; TODO for advanced extension scenarios

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation review, end-to-end validation, and integration verification. Phase docs are authored inline as features ship (repository root `docs/` only — not installed into user projects).

- [ ] T133 [P] Review all docs/ files for accuracy against implemented behavior, resolve stale TODOs, and ensure SC-008 readability without source inspection
- [ ] T134 Run all quickstart.md validation scenarios (Scenarios 1–12) against fixture projects in tests/integration/ and confirm expected outcomes

**Checkpoint**: All quickstart scenarios pass; documentation covers SC-008 without requiring source inspection.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T009 triple-binary build blocks US1 binary install (T046)
- **Foundational (Phase 2)**: Depends on Setup (T009) — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational implementation tasks (T011–T031) and T009 build outputs
- **US2 (Phase 4)**: Depends on US1 (init installs paired `.sh`/`.ps1` scripts to `.spec-n-roll/scripts/`)
- **US3 (Phase 5)**: Depends on US1 (agent skills) and Foundational (core templates, lifecycle, workflow-state)
- **US4 (Phase 6)**: Depends on US3 (specify step and workflow-state populated)
- **US6 (Phase 7)**: Depends on US4 (workflow engine advancement triggers locking)
- **US5 (Phase 8)**: Depends on US3 (taskSpecId for tags) and US4 (implement entry point)
- **US7 (Phase 9)**: Depends on US5 (living specs) and US4 (implement step)
- **US9 (Phase 10)**: Depends on US1 (agent generators, MCP config) and Foundational (backup, ownership, core subcommands)
- **US10 (Phase 11)**: Depends on US9 (update command)
- **US8 (Phase 12)**: Depends on US4 (workflow engine dispatches steps)
- **Polish (Phase 13)**: Depends on all user stories complete

### User Story Independence

- **US1 (P1)** — No story dependencies after Foundational. 🎯 MVP starting point.
- **US2 (P1)** — Depends on US1 init (script install and config).
- **US3 (P1)** — Depends on US1 (skills) and Foundational (core mutations).
- **US4 (P2)** — Depends on US3 (specify exists).
- **US6 (P2)** — Depends on US4 (workflow engine).
- **US5 (P2)** — Depends on US3 (taskSpecId) and US4 (implement entry). Independent of US6 ordering for file areas.
- **US7 (P2)** — Depends on US5 and US4.
- **US9 (P2)** — Depends on US1; partially parallel with US3–US7 after US1.
- **US10 (P2)** — Depends on US9.
- **US8 (P3)** — Depends on US4.

### Within Each User Story

- Test tasks MUST be written and confirmed FAILING before implementation tasks begin
- Within each story: Tests → Core integration → Workflow/agent surfaces → Skill generation → Phase documentation update
- Machine-readable writes MUST go through src/core/ (MCP or CLI) — never duplicate in workflow or agent layers
- Complete each story's checkpoint before beginning dependent stories
- Update repository root `docs/` at each phase checkpoint to reflect implemented behavior only; use explicit TODO markers for not-yet-implemented functionality

### Parallel Opportunities

- All Phase 1 [P] tasks can run in parallel
- Phase 1 T009 and Phase 2 [P] tasks T012–T013, T015–T016, T018–T021, T023, T026–T027, T029–T031 can run in parallel within constraints (T009 before T046)
- US1 generator tasks T037–T040 can run in parallel
- Inline documentation [P] tasks at each phase checkpoint can run in parallel with the next phase's test authoring when dependencies allow
- US5 and US9 can progress in parallel once US1/US4 prerequisites are met (different file areas)
- US10 can start after US9 update skeleton exists
- All [P]-labeled tasks within each story can run in parallel when dependencies are satisfied

---

## Parallel Example: User Story 1

```text
# After T009 build + T031 fixtures ready, start in parallel:
Task T037: cursor bundled extension in src/agents/generators/cursor.ts
Task T038: claude-code generator in src/agents/generators/claude-code.ts
Task T039: copilot generator in src/agents/generators/copilot.ts
Task T040: codex generator in src/agents/generators/codex.ts

# Contract tests in parallel:
Task T035: workflow-config.test.ts
Task T036: agent-mcp-config.test.ts

# After generators + mcp-config.ts (T043), sequentially:
Task T044: init-prompts.tsx
Task T045: workflow.config.json writer
Task T046: CLI + MCP binary install (from T009 outputs)
Task T047: init command orchestration
Task T048: docs/multi-agent.md + docs/cli.md init sections (match implemented behavior)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — P1 stories)

1. Complete Phase 1: Setup (T003, T007, T009 remaining) + triple-binary build packaging
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Multi-Agent Init with MCP config (🎯 core differentiator)
4. Complete Phase 4: US2 — Platform Script Execution
5. Complete Phase 5: US3 — Interactive Specification with template instantiation
6. **STOP and VALIDATE**: Three P1 stories independently testable
7. Developer can initialize a project, select agents, run `/spec-n-specify`, and get a complete spec with MCP-backed state across all agent environments

### Incremental Delivery

1. Setup + Foundational → Core library + MCP/CLI surface ready
2. US1 → Multi-agent init + MCP registration → **Demo: two agents, MCP tools available**
3. US2 → Scripts run cross-platform → **Demo: Windows + macOS same project**
4. US3 → Spec creation with instantiate + interview → **Demo: complete spec from one sentence**
5. US4 → `/spec-n-roll` advances automatically → **Demo: hands-off workflow progression**
6. US6 → Lifecycle enforced → **Demo: audit trail + locking**
7. US5 + US7 → Living specs + TDD → **Demo: behavior-driven full cycle**
8. US9 + US10 → Safe updates + MCP path refresh → **Demo: update without data loss**
9. US8 → Custom extensions → **Demo: replace triage with custom logic**
10. Polish → Final docs review + quickstart validation → **Release candidate**

### Parallel Team Strategy

With multiple developers:

1. Complete Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (generators + MCP config + init)
   - Developer B: Foundational MCP/CLI parity tests (T030) and US9 update tests (T100) once T028–T029 land
3. Once US1 is done: Developer A → US3 (specify); Developer B → US2 (scripts) then US4 once US3 starts
4. US9/US10 track can start after US1 (update/MCP refresh independent of workflow steps)
5. US8 (extensions) starts once US4 workflow engine exists

---

## Notes

- [P] tasks use different files with no dependency on incomplete tasks — safe to parallelize
- [USn] label traces each task to its user story for traceability and independent validation
- TDD tasks are REQUIRED per plan.md — write and confirm FAILING before implementation
- All deterministic mutations live in `src/core/` — MCP (`src/mcp/server.ts`) and CLI subcommands are thin wrappers (SC-012)
- Agent MCP config merge is idempotent — preserve unrelated MCP servers (contracts/agent-mcp-config.md)
- Step outputs MUST be instantiated via MCP/CLI before agent prose edits; living specs remain agent-direct only
- FR-009: task-spec `tasks.md` MUST list living-spec updates as first implementation task(s); enforced in T023 template, T068 test, T075 handler, and T076 skill
- SC-009: `init`, `update`, and `config add-agent` MUST support `--yes` non-interactive mode (T103 test, T111 implementation)
- T009 produces dispatcher, full CLI, and MCP binaries consumed by init (T046) and npm global install
- Tier-skipped artifacts (`plan.md`, `tasks.md`) are omitted — not errors on papercut/quick tiers
- Only one Active task spec in implement phase at a time (US6); plan vertical slices accordingly
- Behavior tests target public interfaces (CLI, MCP tools, workflow-state.json, spec.md output) — not internal module APIs
- Commit after each task or logical group; use `- [ ]` checkbox to track completion
- **Documentation policy**: Update repository root `docs/` at each phase checkpoint to reflect implemented behavior only; use explicit TODO markers for planned but unimplemented functionality. Reading `docs/` to understand current shipped behavior is required for phase review.
- Toolkit docs live in repository root `docs/` only — never installed into user projects