---
name: "spec-n-specify"
description: "Create a new task specification with embedded triage and a one-question-at-a-time interview."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-specify

Create a new task spec under `specs/{numeric-id}-{slug}/` from a feature description.

## Flow

1. **Triage (embedded)** — Evaluate complexity and propose papercut, quick, or full tier with rationale. Confirm or override with the developer before continuing.
2. **Allocate task spec id** — Use MCP `project_metadata_read` / `project_metadata_write` or matching CLI to allocate the next numeric id (handled by toolkit orchestration).
3. **Instantiate spec.md** — Call MCP `step_output_instantiate` with `stepId: specify` and `frontmatter: { status: Active }` **before** editing prose. CLI parallel: `spec-n-roll step instantiate --task-spec-id <id> --step-id specify --frontmatter status=Active`.
4. **Set lifecycle status** — Confirm `status: Active` via MCP `task_spec_status_set` (do not edit YAML frontmatter directly).
5. **Persist workflow variant** — Write `workflow-state.json` with `workflowVariantId` via MCP `workflow_state_write` before the interview proceeds.
6. **Interview** — Ask exactly **one** targeted question at a time with a recommended answer. Explore the repository before asking anything answerable from code. Do not re-ask resolved questions.
7. **Edit prose** — Update `spec.md` body sections directly after instantiation. Remove all `<!-- FILL:` placeholders before finishing.
8. **Complete specify** — Write `workflow-state.json` with `lastCompletedStepId: specify` via MCP `workflow_state_write`.

## Machine-readable mutations (MCP / CLI only)

- `workflow-state.json`
- `spec.md` YAML frontmatter (`status`)
- `project-metadata.json`

Prose in `spec.md` is agent-editable **after** template instantiation.

## User input

```text
$ARGUMENTS
```

The text after `/spec-n-specify` is the feature description. Run embedded triage, then the interview, until the spec passes quality checks (no placeholders; critical questions resolved).
