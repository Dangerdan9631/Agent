---
name: "spec-n-manifesto"
description: "Author or update a global or step-scoped Spec Manifesto through a single-target interview."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-manifesto

Standalone command for **Spec Manifesto** authoring. This is **not** a workflow step — do **not** call `step_init` or `step_finalize`.

## Invocation targets (exactly one per run)

- **Global**: `/spec-n-manifesto global` or equivalent user intent for project-wide rules
- **Step**: `/spec-n-manifesto <stepId>` for one workflow step such as `plan` or `implement`

When the user does not specify a single target, present a numbered choice between global and registered workflow steps. Do not edit multiple manifestos in one invocation.

## Flow

1. **Extension hooks** — Check `.specify/extensions.yml` for `before_manifesto` and `after_manifesto` hooks when registered.
2. **Load existing content** — Read `.spec-n-roll/config/manifesto/global.md` or `steps/{stepId}.md`, or start from the bundled init template with `[PLACEHOLDER]` tokens.
3. **Interview** — Ask the maintainer targeted questions about:
   - Spec-n-roll processes and iterative user feedback during steps
   - MCP-based deterministic step execution (`step_init` / `step_finalize`)
   - Set list triage and lifecycle boundaries where relevant
4. **Iterative feedback** — Refine draft prose until the maintainer confirms.
5. **Validate** — Reject empty bodies, unresolved `[PLACEHOLDER]` tokens, ambiguous step scope, and conflicts with `.specify/memory/constitution.md`. Surface conflicts for user resolution; do not silently merge contradictory governance.
6. **Save** — Persist atomically only after confirmation. Preserve prior content until the user approves the draft.
7. **Sync impact** — Optional HTML comment header describing governance changes (constitution pattern).

## Storage

- Global: `.spec-n-roll/config/manifesto/global.md` (loaded on every `step_init`)
- Step: `.spec-n-roll/config/manifesto/steps/{stepId}.md` (loaded only when `stepId` matches the active step)

## User input

```text
$ARGUMENTS
```

Target scope after the command: `global` or a registered workflow `stepId`.
