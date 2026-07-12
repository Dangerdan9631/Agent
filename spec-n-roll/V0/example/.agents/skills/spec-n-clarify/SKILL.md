---
name: "spec-n-clarify"
description: "Follow-up clarification interview for an existing task specification."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-clarify

Run a **separate** one-question-at-a-time interview on an **existing** task spec.

## Flow

1. **Identify task spec** — When multiple Active specs exist, present a numbered list for the developer to choose (no silent default).
2. **Lifecycle** — When new un-implemented requirements are appended to a Complete spec, call MCP `task_spec_status_set` to revert `status` to `Active` before prose edits.
3. **Interview** — Ask one targeted clarify question at a time with recommended answers. Explore the codebase before asking.
4. **Edit prose** — Append clarifications to `spec.md` body directly. Do not edit YAML frontmatter by hand.
5. **Quality** — Ensure no `<!-- FILL:` placeholders remain and critical clarify topics are resolved.

## Machine-readable mutations (MCP / CLI only)

- `spec.md` YAML frontmatter (`status` transitions Complete → Active when adding requirements)
- `workflow-state.json` when operational status changes are required

Living specs under `living-specs/` remain agent-managed and outside MCP/CLI.

## User input

```text
$ARGUMENTS
```

Optional clarification topic after the command. Use the clarify interview to resolve follow-up ambiguities without creating a new task spec directory.
