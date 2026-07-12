---
name: "spec-n-tasks"
description: "Create tasks.md with living-spec updates as the first implementation tasks (FR-009)."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-tasks

Produces `tasks.md` for quick and full tiers. **FR-009**: the first implementation phase MUST list living-spec updates before any test or production code tasks.

## Flow

1. **Step init** — Call MCP `step_init` (or CLI `spec-n-roll step init`) with `stepId: tasks` **before any work**. Execute mandatory `beforeHooks` from the response before continuing.
2. **Instantiate tasks.md** — Call MCP `step_output_instantiate` with `stepId: tasks` **before** editing prose.
3. **Preserve FR-009 ordering** — Keep "Living Specification Updates" as Phase 1; only add test/code tasks in later phases.
4. **Edit prose** — Fill task checkboxes and remove `<!-- FILL:` placeholders.
5. **Validate** — Confirm tasks.md ordering and placeholders are resolved.
6. **Step finalize** — Call MCP `step_finalize` with `validationPassed: true` **before claiming the step complete**. Execute mandatory `afterHooks` from the response.

## Machine-readable mutations (MCP / CLI only)

- `workflow-state.json` lifecycle via `step_init` / `step_finalize`
- Template instantiation for `tasks.md`

## User input

```text
$ARGUMENTS
```

Optional task-generation hints. Omitted on papercut tier variants.
