---
name: "spec-n-plan"
description: "Create plan.md with living-spec targets for full-tier task specs."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-plan

Full-tier step that produces `plan.md` documenting approach and **Living Spec Targets**.

## Flow

1. **Step init** — Call MCP `step_init` (or CLI `spec-n-roll step init`) with `stepId: plan` **before any work**. Execute mandatory `beforeHooks` from the response before continuing.
2. **Instantiate plan.md** — Call MCP `step_output_instantiate` with `stepId: plan` **before** editing prose.
3. **Edit prose** — Fill Technical Context, Living Spec Targets table, and structure sections. Remove `<!-- FILL:` placeholders.
4. **Validate** — Confirm plan.md is complete and placeholders are resolved.
5. **Step finalize** — Call MCP `step_finalize` with `validationPassed: true` **before claiming the step complete**. Execute mandatory `afterHooks` from the response.

Living specs under `living-specs/` remain agent-managed; plan.md only documents intended targets.

## Machine-readable mutations (MCP / CLI only)

- `workflow-state.json` lifecycle via `step_init` / `step_finalize`
- Template instantiation for `plan.md`

## User input

```text
$ARGUMENTS
```

Optional planning notes. Tier-skipped when the workflow variant omits the plan step.
