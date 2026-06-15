# Contract: Evidence and Workflow Report

Defines discovery evidence, drift findings, test mapping, and report expectations.

## Evidence Rules

| Source Type | Accepted Reference Form | Notes |
|-------------|-------------------------|-------|
| `code` | `src/path/file.ts#symbol` or `src/path/file.ts:line` | Must connect to observable behavior |
| `test` | `tests/path/file.test.ts#test-name` | Mark infrastructure-only tests as indirect |
| `documentation` | `docs/path.md#heading` | Use as intent evidence, not automatic authority |
| `living-spec` | `living-specs/name.feature:Scenario name` | Required for drift findings |
| `configuration` | `.spec-n-roll/config/workflow.config.json#path` | Only when config affects behavior |

## Drift Categories

| Category | Meaning |
|----------|---------|
| `behavior` | Existing living spec no longer matches observed product behavior |
| `documentation` | Docs or wording are stale while behavior remains unchanged |
| `test` | Tests are missing, stale, indirect, or contradict behavior/specs |
| `organization` | Spec grouping, naming, merge, or deletion should change without product behavior change |

## Report Format

The report is markdown stored at:

```text
specs/{taskSpecId}-{slug}/repository-workflow-report.md
```

Required sections:

- `Scope`
- `Specify Output`
- `Evidence Summary`
- `Drift Findings` for drift runs
- `Test Gaps`
- `Assumptions`
- `Limitations`
- `Recommended Next Steps`

## Report Requirements

1. MUST link to the produced `spec.md`.
2. MUST summarize included and omitted scope.
3. MUST list evidence conflicts separately from confirmed facts.
4. MUST tie each test gap to a behavior or proposed living spec.
5. MUST record authority choices captured during specify, when any.
6. MUST keep assumptions separate from facts.
7. MUST be concise and useful without the agent transcript.

## No-Mutation Rule

During repository workflow specify:

- `living-specs/**/*.feature` MUST NOT be created, edited, moved, or deleted.
- Test files MUST NOT be created, edited, moved, or deleted.
- Implementation files MUST NOT be changed.
- Proposed changes are recorded in `spec.md` and the report for downstream implementation.
