---
name: "spec-n-roll"
description: "Advance the workflow to the next tier step with zero-knowledge intent detection."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-roll

Meta-command that reads workflow state and advances to the next incomplete **tier** step automatically.

## Intent detection

- **Description argument** → route to `/spec-n-specify` for a new spec.
- **No description + zero Active specs** → prompt for a feature description.
- **No description + multiple Active specs** → numbered task-selection list (no silent default).
- **Ambiguous paused/incomplete specs** → "new or continue?" prompt.

## Advancement

1. Read `workflow-state.json` via MCP `workflow_state_read` when present (state wins over artifacts after a single confirmation when they conflict).
2. When state is missing, fall back to tier-aware artifact detection (tier-skipped files such as `plan.md` on quick/papercut are not errors).
3. Resolve the next step from the variant step list; skip on-demand `clarify` and `analyze` unless explicitly invoked.
4. When partial artifacts exist for the next step, present **one** three-choice prompt: restart, cancel (paused), or force-clean.
5. Instantiate step outputs via MCP `step_output_instantiate` before prose edits for plan/tasks steps.

## Machine-readable mutations (MCP / CLI only)

- `workflow-state.json`
- Step template instantiation for `plan.md` and `tasks.md`

## User input

```text
$ARGUMENTS
```

Optional feature description for a new spec. Omit to continue the current workflow.
