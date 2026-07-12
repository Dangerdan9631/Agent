# Spec-n-Roll Agent Rules

This file is the canonical source for Spec-N-Roll workflow guidance in this project.

## Workflow commands

Use these slash commands to drive the specification-driven workflow:

- `/spec-n-specify <description>` — create or refine a task specification
- `/spec-n-clarify` — follow-up clarification for the active task spec
- `/spec-n-plan` — produce a plan for the active task spec
- `/spec-n-tasks` — break work into actionable tasks
- `/spec-n-analyze` — cross-artifact quality analysis
- `/spec-n-implement` — implement with living-spec and TDD discipline
- `/spec-n-roll` — advance the workflow to the next incomplete step

## Machine-readable mutations

Deterministic state changes MUST go through the project-local MCP server at
`.spec-n-roll/cli/bin/spec-n-roll-mcp` (stdio transport). Matching CLI subcommands
are available for developers.

MCP tools include workflow state read/write, task spec status, project metadata,
task checkbox updates, step output instantiation, and spec frontmatter updates.

## Living specifications

Living Gherkin feature files under `living-specs/` are agent-managed and outside
the MCP/CLI mutation boundary.
