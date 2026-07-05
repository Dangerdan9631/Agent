---
name: "repository-drift"
description: "Compare existing living specs to current repository evidence and produce one forward specify-stage refresh output."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# Repository Drift Workflow

Run the `repository-drift` workflow type in an **initialized** Spec-n-Roll project that already has `living-specs/` files. Compare current code, tests, and documentation to existing Gherkin scenarios, categorize drift, and produce refresh recommendations through the normal specify stage.

## Flow

1. **Verify initialization** — Confirm `.spec-n-roll/config/workflow.config.json` exists. If missing, stop and instruct the maintainer to run `spec-n-roll init`.
2. **Start workflow** — Use MCP `repository_workflow_start` or CLI `spec-n-roll repository-workflow start --workflow-type-id repository-drift` to receive a recommended discovery plan scoped to existing living specs.
3. **Approve scope** — Let the maintainer accept, narrow, or omit discovery scope before analysis begins.
4. **Analyze drift** — Load existing Gherkin scenarios, compare them to current code, tests, and documentation, and categorize behavior, documentation, test, and organization drift.
5. **Resolve conflicts** — When evidence sources disagree, surface authority questions with **no default** source of truth.
6. **Inject specify context** — Pass drift findings, proposed update/delete/merge intent, test mappings, assumptions, and unresolved ambiguity into the normal specify interview.
7. **Complete specify only** — Produce exactly one `specs/{id}-{slug}/spec.md` with standard headings plus repository sections. Write `workflow-state.json` with `lastCompletedStepId: specify`.
8. **Stop** — Do not run plan, tasks, or implement automatically. Do not write `living-specs/` files or mutate tests during specify.

## Required specify output sections

- Repository Discovery Evidence
- Drift Findings
- Proposed Living Spec Changes
- Test Coverage Mapping
- Unresolved Ambiguity
- Assumptions and Limitations

## Drift categories

- **behavior** — Living spec no longer matches observed product behavior.
- **documentation** — Docs or wording are stale while executable behavior is stable.
- **test** — Tests are missing, stale, or contradict behavior or specs.
- **organization** — Scenarios should merge, delete, or regroup without behavior change.

Unchanged scenarios are confirmed but must **not** be proposed again as duplicate living-spec work.

## Machine-readable operations (MCP / CLI only)

- `repository_workflow_types_list`
- `repository_workflow_start`
- `repository_workflow_drift_run`
- CLI `spec-n-roll repository-workflow drift run`
- Normal specify lifecycle tools (`step_output_instantiate`, `workflow_state_write`, `task_spec_status_set`)

Living specs under `living-specs/` and test files remain downstream implementation work.

## User input

```text
$ARGUMENTS
```

Optional scope notes or maintainer goal for the drift refresh run.
