---
name: "spec-n-analyze"
description: "Non-destructive cross-artifact consistency report for the current task spec."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-analyze

On-demand quality step (not part of default tier advancement). Produces a **non-destructive** report across `spec.md`, `plan.md`, `tasks.md`, and optionally `living-specs/`.

## Checks

- Missing expected artifacts for the selected tier
- Unresolved `<!-- FILL:` placeholders
- FR-009 tasks.md ordering (living-spec updates before test/code tasks)
- Missing Living Spec Targets in `plan.md` when required
- Workflow state vs artifact mismatches

Does **not** modify any files. Re-run after fixes to verify.

## User input

```text
$ARGUMENTS
```

Optional focus area for the analysis report.
