# Quickstart: Step Manifestos and Set Lists

Validation guide for feature 007. Assumes repository built (`npm run build`) and tests runnable (`npm test`).

## Prerequisites

- Node.js 20+
- Built toolkit (`npm run build`)
- Feature branch / `feature.json` pinned to `specs/007-step-manifesto-setlists`
- Test project initialized with `spec-n-roll init`

## Scenario 1: Step init before work (SC-001)

**Goal**: Generated step instructions require init first; init returns manifestos and before hooks.

```bash
npm test -- tests/contract/step-lifecycle.test.ts -t "init"
```

**Manual**:

1. Init a project with a task spec at `plan` step.
2. `spec-n-roll step init --task-spec-id <id> --slug <slug> --step-id plan`
3. Verify JSON includes `manifestos`, `beforeHooks`, `lifecycle` update.

**Expected**: `blocking: false`; `initAt` recorded in workflow state.

## Scenario 2: Finalize gate (SC-002)

**Goal**: Completion rejected without finalize; finalize required after validation.

```bash
npm test -- tests/contract/step-lifecycle.test.ts -t "finalize"
```

**Manual**:

1. Attempt `workflow state write` with `lastCompletedStepId` without finalize → error.
2. Run `step finalize` with `validationPassed true` after init → success.
3. Run finalize again → `alreadyFinalized: true`.

**Expected**: 100% rejection without init; idempotent second finalize.

## Scenario 3: Manifesto scope (SC-003, SC-005)

**Goal**: Global always loaded; step manifesto only for matching step.

1. Create global manifesto content (via skill or fixture).
2. Create `steps/plan.md` step manifesto.
3. Init for `plan` → both scopes present.
4. Init for `tasks` → global only.

```bash
npm test -- tests/integration/step-lifecycle.test.ts -t "manifesto"
```

## Scenario 4: Hook instruction phases (SC-004)

**Goal**: Before hooks in init only; after hooks in finalize only.

1. Configure enabled before/after hooks in `.specify/extensions.yml` for a step.
2. Run init → `beforeHooks` populated, `afterHooks` absent.
3. Run finalize → `afterHooks` populated.

```bash
npm test -- tests/contract/step-lifecycle.test.ts -t "hooks"
```

## Scenario 5: Default set lists (SC-006)

**Goal**: Fresh project has papercut/quick/full as data; no hard-coded triage branches.

```bash
npm test -- tests/contract/set-lists.test.ts -t "defaults"
```

**Manual**: `spec-n-roll set-list list` → three entries with priorities.

**Code check**: `rg "WorkflowTierId|'papercut'|'quick'|'full'" src/setlists src/specs/triage.ts` → no union/type branches (seed/init only).

## Scenario 6: Set-list triage priority (SC-007)

**Goal**: Lower priority number wins when ambiguous.

1. Add two enabled set lists with overlapping descriptions, priorities 2 and 5.
2. `set_list_triage` with ambiguous intent → `selectedId` has priority 2.

```bash
npm test -- tests/integration/set-lists-triage.test.ts
```

## Scenario 7: Disabled set list excluded

1. `spec-n-roll set-list disable quick`
2. Triage → `quick` not in `eligible`.

## Scenario 8: CLI / MCP / Ink round-trip (SC-008)

1. CLI: `set-list update papercut --description "..."`
2. MCP: `set_list_read` → same description.
3. Ink: open set lists screen → matches.

```bash
npm test -- tests/contract/mcp-cli-parity.test.ts -t "set-list"
```

## Scenario 9: Skill metadata (SC-009)

**Goal**: Managed skills have author and version after refresh.

```bash
npm test -- tests/contract/workflow-skills-metadata.test.ts
```

After `spec-n-roll update` or init skills generation, inspect `.agents/skills/spec-n-plan/SKILL.md` frontmatter.

## Scenario 10: Terminology migration (SC-010)

**Goal**: User-facing strings use "set list"; migration guidance for legacy "complexity".

```bash
npm test -- tests/integration/set-lists-triage.test.ts -t "migration"
```

## Full suite

```bash
npm test
```

## References

- Data model: `data-model.md`
- Step lifecycle contract: `contracts/step-lifecycle.md`
- Set lists contract: `contracts/set-lists.md`
- Manifesto contract: `contracts/manifesto.md`
