# Tasks: Versioned Self-Contained Local CLI

**Input**: Design documents from `specs/006-versioned-local-cli/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Test tasks are included because the plan, constitution, and quickstart require coverage for bundled installs, dispatcher integrity, migration, and version reporting (SC-001–SC-006, FR-013).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review design artifacts and existing CLI install/dispatch boundaries before implementation.

- [X] T001 Review layout and dispatcher contracts in `specs/006-versioned-local-cli/contracts/local-install-layout.md`, `specs/006-versioned-local-cli/contracts/dispatcher-delegation.md`, and `specs/006-versioned-local-cli/contracts/install-manifest.schema.json`
- [X] T002 [P] Review current install and launcher implementation in `src/cli/local-binaries.ts`, `src/cli/commands/init.ts`, and `src/cli/commands/update.ts`
- [X] T003 [P] Review dispatcher delegation and version reporting in `src/cli/dispatcher.ts`, `src/cli/commands/version.ts`, and `src/core/paths.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build pipeline staging and core install/integrity modules that MUST complete before user story validation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add standalone local-bundle tsup entry targets for bundled CLI and MCP in `tsup.config.ts` per `specs/006-versioned-local-cli/research.md`
- [X] T005 Create `scripts/build-local-bundle.mjs` to assemble `dist/local-bundle/` (bundled `cli/index.js`, `mcp/server.js`, `templates/`, `scripts/`)
- [X] T006 Wire `build-local-bundle.mjs` into `package.json` `build` script and `scripts/copy-wrappers.mjs`
- [X] T007 [P] Implement `validateLocalInstall` and legacy-layout detection in `src/cli/local-install-integrity.ts` per `specs/006-versioned-local-cli/data-model.md`
- [X] T008 Refactor `buildCliLauncherSource` and `buildMcpLauncherSource` to spawn in-tree `../dist/cli/index.js` and `../dist/mcp/server.js` in `src/cli/local-binaries.ts`
- [X] T009 Refactor `installProjectBinaries` to copy staged bundle, write layout v1 `install.json` and minimal `package.json` in `src/cli/local-binaries.ts`
- [X] T010 Update `collectLauncherBinaryUpdates` to track layout v1 launchers and bundle directory for dry-run in `src/cli/local-binaries.ts`
- [X] T011 [P] Add failing unit tests for launcher sources, manifest v1, and bundle copy in `tests/unit/cli/local-binaries.test.ts`
- [X] T012 [P] Add failing unit tests for integrity validation and legacy detection in `tests/unit/cli/local-install-integrity.test.ts`
- [X] T013 Verify `findToolkitPackageRoot` resolves `.spec-n-roll/cli/package.json` from bundled CLI entry; add unit coverage in `tests/unit/core/paths.test.ts` if missing

**Checkpoint**: `npm run build` produces `dist/local-bundle/`; `installProjectBinaries` writes self-contained layout; unit tests exist and fail until implementation is complete.

---

## Phase 3: User Story 1 - Project-Locked CLI Version (Priority: P1) 🎯 MVP

**Goal**: Each project carries a complete pinned toolkit runtime; commands from a project root use only that project's bundled version.

**Independent Test**: Initialize two projects with different toolkit versions; run version from each root; verify distinct pinned versions and no cross-project coupling per `specs/006-versioned-local-cli/quickstart.md` Scenario 1–2.

### Tests for User Story 1

- [X] T014 [P] [US1] Add failing self-contained install assertions (no `toolkitPackageRoot`, `dist/cli/index.js` present) in `tests/integration/quickstart-scenarios.test.ts`
- [X] T015 [P] [US1] Create pre-staged bundle fixtures in `tests/fixtures/local-bundle-version-a/` and `tests/fixtures/local-bundle-version-b/`
- [X] T016 [P] [US1] Add failing two-project version isolation integration test in `tests/integration/local-bundle-multi-version.test.ts`

### Implementation for User Story 1

- [X] T017 [US1] Implement bundle install path so `runInit` produces layout v1 via existing `installProjectBinaries` call in `src/cli/commands/init.ts`
- [X] T018 [US1] Add failing local install isolation test (commands succeed without external toolkit root) in `tests/integration/local-bundle-isolation.test.ts`
- [X] T019 [US1] Verify User Story 1 with `npm test -- tests/unit/cli/local-binaries.test.ts tests/integration/quickstart-scenarios.test.ts tests/integration/local-bundle-multi-version.test.ts tests/integration/local-bundle-isolation.test.ts`

**Checkpoint**: User Story 1 is independently testable — per-project pinned self-contained installs work.

---

## Phase 4: User Story 2 - Dispatcher Delegates to Any Local Version (Priority: P1)

**Goal**: Global dispatcher remains the sole PATH entry; it delegates to any local bundle via stable spawn contract with integrity gating and no silent global fallback.

**Independent Test**: Invoke dispatcher from project with local bundle; verify local version runs, `--global` bypass works, corrupt install fails clearly per `specs/006-versioned-local-cli/quickstart.md` Scenarios 2 and 6.

### Tests for User Story 2

- [X] T020 [P] [US2] Add failing dispatcher integrity unit tests in `tests/unit/cli/dispatcher-integrity.test.ts`
- [X] T021 [P] [US2] Add failing corrupt-install and no-fallback integration cases in `tests/integration/quickstart-scenarios.test.ts`
- [X] T022 [P] [US2] Add failing dispatcher version-skew delegation test in `tests/integration/quickstart-scenarios.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Call `validateLocalInstall` before local spawn and return actionable errors in `src/cli/dispatcher.ts` per `specs/006-versioned-local-cli/contracts/dispatcher-delegation.md`
- [X] T024 [US2] Verify User Story 2 with `npm test -- tests/unit/cli/dispatcher-integrity.test.ts tests/integration/quickstart-scenarios.test.ts`

**Checkpoint**: User Stories 1 and 2 both work — dispatcher delegates to self-contained local bundles with integrity enforcement.

---

## Phase 5: User Story 3 - Initialize and Update Produce Complete Local Install (Priority: P2)

**Goal**: Init, update, manage-local binary refresh, and remove flows maintain the self-contained bundle lifecycle including legacy migration.

**Independent Test**: Run update from version A to B; migrate legacy wrapper fixture; remove deletes bundle per `specs/006-versioned-local-cli/quickstart.md` Scenarios 4–5 and 7.

### Tests for User Story 3

- [X] T025 [P] [US3] Create legacy wrapper fixture in `tests/fixtures/legacy-wrapper-install/` with `toolkitPackageRoot` in `install.json`
- [X] T026 [P] [US3] Add failing legacy migration integration test in `tests/integration/legacy-install-migration.test.ts`
- [X] T027 [P] [US3] Add failing bundle upgrade integration test in `tests/integration/local-bundle-upgrade.test.ts`

### Implementation for User Story 3

- [X] T028 [US3] Update `runUpdate` dry-run and apply paths to list and replace `.spec-n-roll/cli/dist/` bundle in `src/cli/commands/update.ts`
- [X] T029 [US3] Ensure `runProjectRemove` deletes self-contained cli runtime including `dist/` in `src/cli/commands/remove.ts`
- [X] T030 [US3] Confirm manage-local "Update Spec N' Roll" refreshes bundled layout via `installProjectBinaries` in `src/cli/ink/screens/manage/manage-local.tsx`
- [X] T031 [US3] Verify User Story 3 with `npm test -- tests/integration/legacy-install-migration.test.ts tests/integration/local-bundle-upgrade.test.ts tests/integration/interactive-local-home.test.ts`

**Checkpoint**: User Story 3 lifecycle commands produce, upgrade, migrate, and remove self-contained installs.

---

## Phase 6: User Story 4 - Agent Integration Uses Local Bundled Server (Priority: P2)

**Goal**: Project-local MCP server entry point is part of the same bundled install and remains the agent config target.

**Independent Test**: After init, agent MCP config references `bin/spec-n-roll-mcp`; MCP launcher spawns bundled `dist/mcp/server.js` per `specs/006-versioned-local-cli/spec.md` User Story 4.

### Tests for User Story 4

- [X] T032 [P] [US4] Add failing MCP launcher bundled-path and spawn target assertions in `tests/unit/cli/local-binaries.test.ts`
- [X] T033 [P] [US4] Add failing MCP config path smoke after init in `tests/integration/local-bundle-isolation.test.ts`

### Implementation for User Story 4

- [X] T034 [US4] Verify `refreshConfiguredAgentMcpConfigs` still targets `.spec-n-roll/cli/bin/spec-n-roll-mcp` after bundle install in `src/cli/commands/update.ts` and init agent setup flow
- [X] T035 [US4] Verify User Story 4 with `npm test -- tests/unit/cli/local-binaries.test.ts tests/integration/local-bundle-isolation.test.ts`

**Checkpoint**: Agent MCP integration uses bundled local server aligned with CLI version.

---

## Phase 7: User Story 5 - Version Transparency (Priority: P3)

**Goal**: Version command reports dispatcher version, executed binary version, local/global target, and local path when delegated.

**Independent Test**: Run `version` via dispatcher and direct local launcher; verify combined report fields per `specs/006-versioned-local-cli/quickstart.md` and SC-005.

### Tests for User Story 5

- [X] T036 [P] [US5] Add failing version report tests for local bundled `package.json` resolution in `tests/unit/cli/version.test.ts`
- [X] T037 [P] [US5] Extend delegated version report integration assertions in `tests/integration/quickstart-scenarios.test.ts`

### Implementation for User Story 5

- [X] T038 [US5] Ensure `readToolkitPackageVersion` and `buildVersionReport` resolve version from `.spec-n-roll/cli/package.json` when running bundled entry in `src/cli/commands/version.ts`
- [X] T039 [US5] Verify User Story 5 with `npm test -- tests/unit/cli/version.test.ts tests/integration/quickstart-scenarios.test.ts`

**Checkpoint**: All user stories independently functional; version transparency complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and full validation across stories.

- [X] T040 [P] Update `src/cli/README.md` to document self-contained local install layout and dispatcher integrity behavior
- [X] T041 [P] Add multiline doc comments to new public APIs in `src/cli/local-install-integrity.ts` and updated exports in `src/cli/local-binaries.ts` per `AGENTS.md`
- [X] T042 Run full test suite and lint: `npm test` and `npm run lint`
- [X] T043 Run all scenarios in `specs/006-versioned-local-cli/quickstart.md` and fix any gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–7)**: Depend on Foundational completion
  - US1 (Phase 3) before US2 (Phase 4) recommended — US2 tests assume working bundle install from US1
  - US3–US5 can proceed after Foundational; US3 benefits from US1/US2 being stable
- **Polish (Phase 8)**: Depends on all desired user stories

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | Two projects, distinct versions, self-contained `dist/` |
| US2 | P1 | Foundational, US1 install path | Dispatcher delegate, `--global`, corrupt install error |
| US3 | P2 | Foundational | Update, legacy migration, remove, manage-local refresh |
| US4 | P2 | Foundational, US1 bundle | MCP launcher + agent config path |
| US5 | P3 | Foundational, US2 delegation | Version report fields from bundled install |

### Within Each User Story

- Tests MUST be written and FAIL before implementation (constitution V)
- Foundational unit tests (T011–T012) gate story integration tests
- Story verification task is last in each phase

### Parallel Opportunities

- **Phase 1**: T002 and T003 in parallel
- **Phase 2**: T007, T011, T012 in parallel after T004–T006; T008–T010 sequential on `local-binaries.ts`
- **Phase 3**: T014–T016 test tasks in parallel
- **Phase 4**: T020–T022 in parallel
- **Phase 5**: T025–T027 in parallel
- **Phase 6**: T032–T033 in parallel
- **Phase 7**: T036–T037 in parallel
- **Phase 8**: T040–T041 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch US1 test tasks together:
# T014 self-contained assertions in tests/integration/quickstart-scenarios.test.ts
# T015 fixtures in tests/fixtures/local-bundle-version-a/ and tests/fixtures/local-bundle-version-b/
# T016 two-project test in tests/integration/local-bundle-multi-version.test.ts
```

---

## Parallel Example: Foundational Phase

```bash
# After T004–T006 build pipeline lands:
# T007 integrity module in src/cli/local-install-integrity.ts
# T011 unit tests in tests/unit/cli/local-binaries.test.ts
# T012 unit tests in tests/unit/cli/local-install-integrity.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` for US1 checkpoint
5. Demo per-project pinned self-contained installs

### Incremental Delivery

1. Foundational → bundled build + install + integrity modules
2. US1 → per-project version lock (MVP)
3. US2 → dispatcher integrity and delegation hardening
4. US3 → update/migrate/remove lifecycle
5. US4 → MCP bundled server parity
6. US5 → version report polish
7. Polish → docs and full quickstart pass

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: US1 + US2 (install + dispatcher)
   - Developer B: US3 (update/migration/remove)
   - Developer C: US4 + US5 (MCP + version reporting)
3. Integrate at Phase 8 polish

---

## Notes

- Global npm `dist/` layout for dispatcher and full CLI publish MUST remain unchanged; only `dist/local-bundle/` is copied into projects
- Legacy `toolkitPackageRoot` installs fail integrity until `update` migrates them
- Manage-local binary update reuses `installProjectBinaries` — no separate copy path
- Total tasks: **43** (T001–T043)
- Task count per story: Setup 3, Foundational 10, US1 6, US2 5, US3 7, US4 4, US5 4, Polish 4
