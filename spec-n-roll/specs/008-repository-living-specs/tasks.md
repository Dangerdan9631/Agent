# Tasks: Repository Living Specs

**Input**: Design documents from `specs/008-repository-living-specs/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by constitution Principle VI and the feature success criteria. Write test tasks before implementation tasks in each story and verify they fail for the intended missing behavior.

**Organization**: Tasks are grouped by user story so repository onboarding, test mapping, drift, plan approval, safety boundaries, and reporting can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or depends only on completed shared foundation
- **[Story]**: User story label from `spec.md`
- Include exact file paths in every task

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the repository workflow module surface and fixture locations used by all stories.

- [X] T001 Create repository workflow directory overview in `src/repository/README.md`
- [X] T002 Create repository workflow module skeletons in `src/repository/discovery-plan.ts`, `src/repository/evidence.ts`, `src/repository/drift.ts`, `src/repository/report.ts`, and `src/repository/workflow-run.ts`
- [X] T003 [P] Create repository workflow fixture directories in `tests/fixtures/repository-workflows/onboarding-basic/`, `tests/fixtures/repository-workflows/drift-basic/`, and `tests/fixtures/repository-workflows/large-repo/`
- [X] T004 [P] Add repository workflow test helpers in `tests/helpers/repository-workflows.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared schemas, core types, artifact paths, and fixture scaffolding required before any user story can be implemented.

**Critical**: No user story work can begin until this phase is complete.

- [X] T005 Add repository workflow type, scope, bounds, evidence, drift finding, test mapping, and specify injection schemas in `src/config/schema.ts`
- [X] T006 [P] Define repository workflow type constants and exported TypeScript types in `src/repository/workflow-run.ts`
- [X] T007 [P] Define repository evidence and test coverage mapping helpers in `src/repository/evidence.ts`
- [X] T008 [P] Define discovery plan builder types and path normalization helpers in `src/repository/discovery-plan.ts`
- [X] T009 [P] Define drift category helpers in `src/repository/drift.ts`
- [X] T010 [P] Define report path and markdown section helpers in `src/repository/report.ts`
- [X] T011 Add repository workflow artifact path helpers for report files in `src/workflow/artifacts.ts`
- [X] T012 Add initialized-project guard for repository workflows in `src/repository/workflow-run.ts`
- [X] T013 [P] Add fixture package/config/test/doc files for onboarding in `tests/fixtures/repository-workflows/onboarding-basic/`
- [X] T014 [P] Add fixture living specs, changed code, changed tests, and docs for drift in `tests/fixtures/repository-workflows/drift-basic/`
- [X] T015 [P] Add bounded-scope fixture content for large repository planning in `tests/fixtures/repository-workflows/large-repo/`
- [X] T016 Add repository workflow exports in `src/repository/workflow-run.ts` and `src/repository/evidence.ts`

**Checkpoint**: Shared repository workflow models, paths, and fixtures are ready.

---

## Phase 3: User Story 1 - Build Living Specs From an Existing Repository (Priority: P1) - MVP

**Goal**: Start repository onboarding in an initialized repository, discover behavior evidence, inject it into normal specify, produce one forward feature spec, and stop after specify.

**Independent Test**: Run onboarding against an initialized fixture with no living specs and verify one `spec.md` is created, it contains evidence-backed proposed living-spec work, and no `living-specs/` files are written.

### Tests for User Story 1

- [X] T017 [P] [US1] Add contract test for initialized scaffolding requirement and onboarding workflow type listing in `tests/contract/repository-workflows.test.ts`
- [X] T018 [P] [US1] Add integration test for onboarding producing one specify-stage output without living-spec mutations in `tests/integration/repository-onboarding.test.ts`
- [X] T019 [P] [US1] Add unit tests for user-facing behavior discovery and evidence classification in `tests/unit/repository-discovery.test.ts`
- [X] T020 [P] [US1] Add unit tests for specify-stage injection serialization preserving standard headings in `tests/unit/specify-injection.test.ts`

### Implementation for User Story 1

- [X] T021 [US1] Implement repository onboarding workflow type metadata in `src/repository/workflow-run.ts`
- [X] T022 [US1] Implement initialized scaffolding validation and blocking guidance in `src/repository/workflow-run.ts`
- [X] T023 [US1] Implement behavior, documentation, and test inventory collection for onboarding scope in `src/repository/evidence.ts`
- [X] T024 [US1] Implement specify-stage injection input support in `src/specs/specify.ts`
- [X] T025 [US1] Extend interview topic creation to accept injected repository questions in `src/specs/interview.ts`
- [X] T026 [US1] Render repository evidence and proposed living-spec sections into `spec.md` in `src/specs/specify.ts`
- [X] T027 [US1] Ensure repository onboarding marks `lastCompletedStepId` as `specify` and does not advance plan/tasks in `src/repository/workflow-run.ts`
- [X] T028 [US1] Add repository onboarding command registration in `src/cli/commands/repository-workflow.ts` and `src/cli/index.ts`
- [X] T029 [US1] Add repository onboarding MCP tool handler in `src/mcp/tools.ts`
- [X] T030 [US1] Update generated workflow skill guidance for repository onboarding in `src/agents/generators/workflow-skills.ts`

**Checkpoint**: User Story 1 is independently functional and validates the MVP.

---

## Phase 4: User Story 2 - Map Existing Tests to Living Specs (Priority: P1)

**Goal**: Connect discovered behavior to existing direct or indirect tests, identify gaps, and inject the resulting mapping into specify output.

**Independent Test**: Run onboarding against a fixture with covered, indirectly covered, and uncovered behavior and verify each proposed spec lists supporting tests or an explicit test gap.

### Tests for User Story 2

- [X] T031 [P] [US2] Add unit tests for direct, indirect, missing, and unknown test coverage mapping in `tests/unit/repository-evidence.test.ts`
- [X] T032 [P] [US2] Add integration assertions for test mapping and explicit gaps in onboarding output in `tests/integration/repository-onboarding.test.ts`

### Implementation for User Story 2

- [X] T033 [US2] Implement test file discovery and behavior-facing test reference extraction in `src/repository/evidence.ts`
- [X] T034 [US2] Implement direct, indirect, missing, and unknown coverage classification in `src/repository/evidence.ts`
- [X] T035 [US2] Implement test gap recommendation creation in `src/repository/evidence.ts`
- [X] T036 [US2] Serialize test coverage mapping into specify-stage injection sections in `src/specs/specify.ts`
- [X] T037 [US2] Include test mapping summary in onboarding workflow responses in `src/repository/workflow-run.ts`

**Checkpoint**: User Story 2 is independently testable through evidence mapping and onboarding output.

---

## Phase 5: User Story 3 - Update Living Specs When Code Drifts (Priority: P1)

**Goal**: Start repository drift in a repository with existing living specs, compare current evidence, categorize drift, inject findings into specify, and avoid duplicate spec proposals.

**Independent Test**: Run drift against a fixture with changed, unchanged, obsolete, and ambiguous living specs and verify categorized findings with evidence and authority questions.

### Tests for User Story 3

- [X] T038 [P] [US3] Add unit tests for behavior, documentation, test, and organization drift categorization in `tests/unit/repository-drift.test.ts`
- [X] T039 [P] [US3] Add integration test for drift workflow comparing existing living specs to current repository evidence in `tests/integration/repository-drift.test.ts`
- [X] T040 [P] [US3] Add integration test for conflicting evidence requiring maintainer authority choice in `tests/integration/repository-drift.test.ts`

### Implementation for User Story 3

- [X] T041 [US3] Implement repository drift workflow type metadata in `src/repository/workflow-run.ts`
- [X] T042 [US3] Load and normalize existing Gherkin scenarios for drift analysis in `src/repository/drift.ts`
- [X] T043 [US3] Implement drift comparison between living specs and repository evidence in `src/repository/drift.ts`
- [X] T044 [US3] Implement obsolete, merged, unchanged, and ambiguous living-spec detection in `src/repository/drift.ts`
- [X] T045 [US3] Add no-default-authority conflict questions to specify injection in `src/repository/drift.ts`
- [X] T046 [US3] Render drift findings and proposed update/delete/merge intent in `src/specs/specify.ts`
- [X] T047 [US3] Add repository drift CLI command in `src/cli/commands/repository-workflow.ts`
- [X] T048 [US3] Add repository drift MCP tool handler in `src/mcp/tools.ts`
- [X] T049 [US3] Update generated workflow skill guidance for repository drift in `src/agents/generators/workflow-skills.ts`

**Checkpoint**: User Story 3 is independently functional for drift refresh runs.

---

## Phase 6: User Story 4 - Recommend an Onboarding Plan Before Writing Artifacts (Priority: P2)

**Goal**: Present a recommended discovery plan, let maintainers adjust scope and bounds, and record the approved plan before analysis begins.

**Independent Test**: Run onboarding with no detailed options, change at least one scope choice, and verify discovery follows the revised plan and report records the selected scope.

### Tests for User Story 4

- [X] T050 [P] [US4] Add unit tests for default, narrowed, broadened, and bounded discovery plans in `tests/unit/repository-discovery.test.ts`
- [X] T051 [P] [US4] Add integration test for bounded large-repository first-pass planning in `tests/integration/repository-onboarding.test.ts`

### Implementation for User Story 4

- [X] T052 [US4] Implement discovery plan recommendation defaults and bounds in `src/repository/discovery-plan.ts`
- [X] T053 [US4] Implement approved scope normalization and inside-root validation in `src/repository/discovery-plan.ts`
- [X] T054 [US4] Add plan-only CLI command output in `src/cli/commands/repository-workflow.ts`
- [X] T055 [US4] Add `repository_workflow_plan` MCP tool in `src/mcp/tools.ts`
- [X] T056 [US4] Persist approved discovery plan details into workflow run responses in `src/repository/workflow-run.ts`

**Checkpoint**: User Story 4 can be validated without running full drift or reporting UI work.

---

## Phase 7: User Story 5 - Preserve Maintainer Control and Repository Safety (Priority: P2)

**Goal**: Enforce specify-stage safety boundaries, keep clarify correction available, and stop with blockers instead of partial output when analysis cannot proceed.

**Independent Test**: Run workflows with existing living specs and tests, verify no authoritative files change during specify, then clarify the output before plan.

### Tests for User Story 5

- [X] T057 [P] [US5] Add integration test that snapshots `living-specs/` and test files before and after repository workflows in `tests/integration/repository-onboarding.test.ts`
- [X] T058 [P] [US5] Add integration test for clarify compatibility after repository workflow specify output in `tests/integration/repository-drift.test.ts`
- [X] T059 [P] [US5] Add contract test for blocker responses without partial artifact writes in `tests/contract/repository-workflows.test.ts`

### Implementation for User Story 5

- [X] T060 [US5] Add no-mutation snapshot guard around repository workflow specify execution in `src/repository/workflow-run.ts`
- [X] T061 [US5] Ensure specify quality checks accept repository sections while preserving clarify compatibility in `src/specs/quality.ts`
- [X] T062 [US5] Implement blocker result types and clear stopping guidance in `src/repository/workflow-run.ts`
- [X] T063 [US5] Record proposed deletions and merges as downstream intent only in `src/specs/specify.ts`
- [X] T064 [US5] Add safety-boundary error handling to CLI and MCP adapters in `src/cli/commands/repository-workflow.ts` and `src/mcp/tools.ts`

**Checkpoint**: User Story 5 verifies maintainer control and safe workflow boundaries.

---

## Phase 8: User Story 6 - Produce an Actionable Onboarding Report (Priority: P3)

**Goal**: Produce a concise durable report with scope, evidence, drift findings, test gaps, assumptions, specify output reference, and next steps.

**Independent Test**: Complete onboarding or drift and verify the report contains all required sections and links to the specify-stage output.

### Tests for User Story 6

- [X] T065 [P] [US6] Add unit tests for repository workflow report markdown sections in `tests/unit/repository-report.test.ts`
- [X] T066 [P] [US6] Add contract test for CLI and MCP report reads returning the same content in `tests/contract/mcp-cli-parity.test.ts`
- [X] T067 [P] [US6] Add Ink read-model test for repository workflow report summaries in `tests/unit/interactive/read-models.test.ts`

### Implementation for User Story 6

- [X] T068 [US6] Implement report markdown rendering with required sections in `src/repository/report.ts`
- [X] T069 [US6] Write repository workflow report artifacts after successful specify completion in `src/repository/workflow-run.ts`
- [X] T070 [US6] Add report read CLI command in `src/cli/commands/repository-workflow.ts`
- [X] T071 [US6] Add `repository_workflow_report_read` MCP tool in `src/mcp/tools.ts`
- [X] T072 [US6] Add repository workflow Ink read-model in `src/cli/ink/read-models/repository-workflows.ts`
- [X] T073 [US6] Add repository workflow Ink screens in `src/cli/ink/screens/repository-workflows/`
- [X] T074 [US6] Register repository workflow Ink navigation entries in `src/cli/ink/app/navigation.ts` and `src/cli/ink/app/App.tsx`

**Checkpoint**: User Story 6 produces durable reporting and UI/read surfaces.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, parity, validation, and cleanup across all stories.

- [X] T075 [P] Update source directory documentation for repository workflow responsibilities in `src/repository/README.md`, `src/specs/README.md`, `src/mcp/README.md`, and `src/cli/README.md`
- [X] T076 [P] Add generated skill metadata or descriptions for repository workflow skills in `.agents/skills/`
- [X] T077 Add CLI/MCP parity assertions for repository workflow type list and plan outputs in `tests/contract/mcp-cli-parity.test.ts`
- [X] T078 Run quickstart validation commands from `specs/008-repository-living-specs/quickstart.md`
- [X] T079 Run affected test suites with `npm test -- tests/unit/repository-discovery.test.ts tests/unit/repository-evidence.test.ts tests/unit/repository-drift.test.ts tests/unit/specify-injection.test.ts tests/contract/repository-workflows.test.ts tests/integration/repository-onboarding.test.ts tests/integration/repository-drift.test.ts`
- [X] T080 Run full validation with `npm test` and `npm run lint`
- [X] T081 Remove any incidental compatibility aliases or duplicated repository workflow branches in `src/repository/`, `src/specs/`, `src/cli/commands/repository-workflow.ts`, and `src/mcp/tools.ts`
- [X] T082 Review top-level doc comments and schema field comments in `src/repository/`, `src/config/schema.ts`, `src/specs/specify.ts`, and `src/specs/interview.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundation; this is the MVP.
- **US2 (Phase 4)**: Depends on Foundation and may integrate with US1 specify output.
- **US3 (Phase 5)**: Depends on Foundation and can proceed after shared evidence helpers exist.
- **US4 (Phase 6)**: Depends on Foundation; can proceed in parallel with US2/US3 after shared discovery plan helpers exist.
- **US5 (Phase 7)**: Depends on US1 and should validate safety across US1/US3 flows.
- **US6 (Phase 8)**: Depends on US1 plus report data from US2/US3/US4 where available.
- **Polish (Phase 9)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No story dependency after Foundation; recommended MVP.
- **US2 (P1)**: Uses shared evidence model and enriches US1 output; independently testable after Foundation.
- **US3 (P1)**: Uses shared evidence model and Gherkin utilities; independently testable after Foundation.
- **US4 (P2)**: Independent plan recommendation path after Foundation.
- **US5 (P2)**: Depends on at least US1 workflow execution and should also cover US3 when available.
- **US6 (P3)**: Depends on completed workflow outputs to render and read reports.

### Within Each User Story

- Tests before implementation.
- Domain helpers before CLI/MCP/Ink adapters.
- Core workflow behavior before generated agent skill guidance.
- Each story checkpoint should pass before moving to the next priority when working sequentially.

---

## Parallel Opportunities

- T003 and T004 can run after T001/T002 because fixtures and helpers are separate files.
- T006 through T010 and T013 through T015 can run in parallel after T005 establishes schema direction.
- US1 test tasks T017 through T020 can run in parallel.
- US2 test tasks T031 and T032 can run in parallel; T033 through T035 are mostly confined to `src/repository/evidence.ts` and should be sequenced.
- US3 test tasks T038 through T040 can run in parallel; T047 through T049 can run after core drift behavior lands.
- US4 test tasks T050 and T051 can run in parallel with US2/US3 after Foundation.
- US6 report, CLI/MCP report read, and Ink read-model tasks can split after T068 defines report output.

---

## Parallel Example: User Story 1

```bash
Task: "Add contract test for initialized scaffolding requirement and onboarding workflow type listing in tests/contract/repository-workflows.test.ts"
Task: "Add integration test for onboarding producing one specify-stage output without living-spec mutations in tests/integration/repository-onboarding.test.ts"
Task: "Add unit tests for user-facing behavior discovery and evidence classification in tests/unit/repository-discovery.test.ts"
Task: "Add unit tests for specify-stage injection serialization preserving standard headings in tests/unit/specify-injection.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add unit tests for behavior, documentation, test, and organization drift categorization in tests/unit/repository-drift.test.ts"
Task: "Add integration test for drift workflow comparing existing living specs to current repository evidence in tests/integration/repository-drift.test.ts"
Task: "Add integration test for conflicting evidence requiring maintainer authority choice in tests/integration/repository-drift.test.ts"
```

## Parallel Example: User Story 6

```bash
Task: "Add unit tests for repository workflow report markdown sections in tests/unit/repository-report.test.ts"
Task: "Add contract test for CLI and MCP report reads returning the same content in tests/contract/mcp-cli-parity.test.ts"
Task: "Add Ink read-model test for repository workflow report summaries in tests/unit/interactive/read-models.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for repository onboarding.
3. Validate with `tests/contract/repository-workflows.test.ts`, `tests/integration/repository-onboarding.test.ts`, `tests/unit/repository-discovery.test.ts`, and `tests/unit/specify-injection.test.ts`.
4. Stop and review the specify-only behavior before adding drift, reporting, and UI surfaces.

### Incremental Delivery

1. Add US1 onboarding MVP.
2. Add US2 test mapping so proposed living specs are validation-aware.
3. Add US3 drift refresh for repositories with existing living specs.
4. Add US4 plan-first scope approval for large repositories.
5. Add US5 safety boundaries and clarify compatibility across workflows.
6. Add US6 durable reports and browsing surfaces.

### Parallel Team Strategy

1. One developer owns shared schemas and repository workflow core.
2. After Foundation, split US2 evidence mapping, US3 drift analysis, and US4 discovery planning.
3. Integrate US5 safety checks after US1 and US3 execution paths exist.
4. Finish US6 reports and Ink read surfaces after core workflow outputs stabilize.
