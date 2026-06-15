# Quickstart: Repository Living Specs

Validation guide for feature 008. Assumes dependencies installed and the toolkit can run with `npm test`.

## Prerequisites

- Node.js 22+
- Repository initialized with `spec-n-roll init`
- Feature branch / `feature.json` pinned to `specs/008-repository-living-specs`
- Fixture repositories with code, tests, docs, and optional `living-specs/*.feature`

## Scenario 1: Onboarding requires initialized scaffolding (FR-031)

**Goal**: Repository workflow stops clearly when Spec-n-Roll config is missing.

```bash
npm test -- tests/contract/repository-workflows.test.ts -t "requires initialized scaffolding"
```

**Manual**:

1. Run repository onboarding in a temporary project without `.spec-n-roll/config/workflow.config.json`.
2. Verify the command fails with guidance to run `spec-n-roll init`.

**Expected**: No `specs/`, `living-specs/`, or test files are created.

## Scenario 2: Onboarding produces one specify-stage output (SC-001, SC-003)

**Goal**: Existing behavior is converted into proposed living-spec/test work through normal specify only.

```bash
npm test -- tests/integration/repository-onboarding.test.ts -t "produces one specify output"
```

**Manual**:

1. Use an initialized fixture repository with no living specs.
2. Start the repository onboarding workflow with default scope.
3. Accept the recommended discovery plan.
4. Complete the normal specify interview.

**Expected**: Exactly one `specs/{id}-{slug}/spec.md` and one `repository-workflow-report.md` are produced; `living-specs/` and test files remain unchanged.

## Scenario 3: Existing tests map to proposed specs (SC-004, SC-005)

**Goal**: Every behavior has direct/indirect test evidence or an explicit gap.

```bash
npm test -- tests/unit/repository-evidence.test.ts -t "test coverage mapping"
```

**Expected**: Direct tests are listed as supporting evidence, infrastructure-only tests are indirect, and uncovered behavior has a recommended validation target.

## Scenario 4: Drift workflow compares existing living specs (SC-002, SC-007)

**Goal**: Drift findings are categorized without regenerating or duplicating specs.

```bash
npm test -- tests/integration/repository-drift.test.ts -t "categorizes drift"
```

**Manual**:

1. Use an initialized fixture with existing `living-specs/*.feature`.
2. Change code/docs/tests so some scenarios are changed, unchanged, obsolete, and ambiguous.
3. Run the repository drift workflow for that scope.

**Expected**: Findings are categorized as behavior, documentation, test, or organization drift; no living-spec file is changed during specify.

## Scenario 5: Evidence conflicts ask for authority (FR-016)

**Goal**: Conflicting code/test/doc/spec evidence has no default source of truth.

```bash
npm test -- tests/integration/repository-drift.test.ts -t "conflicting evidence"
```

**Expected**: Specify-stage output records the conflict and authority question for clarify/specify instead of silently choosing code, tests, docs, or existing living specs.

## Scenario 6: Large repository uses bounded first pass (SC-006)

**Goal**: Recommended discovery plan limits scope and records omitted areas.

```bash
npm test -- tests/integration/repository-onboarding.test.ts -t "bounded first pass"
```

**Expected**: Report includes included paths, omitted paths, selected bounds, and next suggested scoped run.

## Scenario 7: Specify injection preserves standard structure (SC-011)

**Goal**: Repository workflow context augments specify without replacing its contract.

```bash
npm test -- tests/unit/specify-injection.test.ts
```

**Expected**: Generated `spec.md` keeps standard headings, quality checklist compatibility, clarify compatibility, evidence sections, and downstream planning readiness.

## Scenario 8: CLI and MCP parity

**Goal**: Repository workflow operations produce equivalent outputs through CLI and MCP adapters.

```bash
npm test -- tests/contract/mcp-cli-parity.test.ts -t "repository workflow"
```

**Expected**: CLI and MCP return the same workflow type metadata, discovery plan, run status, and report references for equivalent inputs.

## Full suite

```bash
npm test
```

## References

- Data model: `data-model.md`
- Repository workflow contract: `contracts/repository-workflows.md`
- Specify injection contract: `contracts/specify-injection.md`
- Evidence report contract: `contracts/evidence-report.md`
- CLI/MCP parity contract: `contracts/mcp-cli-parity.md`
