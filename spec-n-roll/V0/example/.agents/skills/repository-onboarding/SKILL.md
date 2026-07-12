---
name: "repository-onboarding"
description: "Discover repository behavior evidence and produce one forward specify-stage output for living-spec work."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# Repository Onboarding Workflow

Run the `repository-onboarding` workflow type in an **initialized** Spec-n-Roll project to convert discovered behavior into proposed living-spec and test work through the normal specify stage.

## Flow

1. **Verify initialization** — Confirm `.spec-n-roll/config/workflow.config.json` exists. If missing, stop and instruct the maintainer to run `spec-n-roll init`.
2. **Start workflow** — Use MCP `repository_workflow_start` or CLI `spec-n-roll repository-workflow start --workflow-type-id repository-onboarding` to receive a recommended discovery plan.
3. **Approve scope** — Let the maintainer accept, narrow, broaden, or omit discovery scope before analysis begins.
4. **Discover evidence** — Inventory user-facing code behavior, documentation, and tests within the approved scope. Exclude internal-only utilities unless they connect to observable behavior.
5. **Inject specify context** — Pass repository evidence, proposed living-spec changes, test mappings, assumptions, and unresolved ambiguity into the normal specify interview.
6. **Complete specify only** — Produce exactly one `specs/{id}-{slug}/spec.md` with standard headings plus repository sections. Write `workflow-state.json` with `lastCompletedStepId: specify`.
7. **Stop** — Do not run plan, tasks, or implement automatically. Do not write `living-specs/` files or mutate tests during specify.

## Required specify output sections

- Repository Discovery Evidence
- Proposed Living Spec Changes
- Test Coverage Mapping
- Unresolved Ambiguity
- Assumptions and Limitations

## Machine-readable operations (MCP / CLI only)

- `repository_workflow_types_list`
- `repository_workflow_start`
- Normal specify lifecycle tools (`step_output_instantiate`, `workflow_state_write`, `task_spec_status_set`)

Living specs under `living-specs/` and test files remain downstream implementation work.

## User input

```text
$ARGUMENTS
```

Optional scope notes or maintainer goal for the onboarding run.
