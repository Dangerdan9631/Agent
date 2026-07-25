# Workflow

File-backed workflow state, step sequencing, and engine advancement for specification-driven development. This layer tracks where a task spec is in its selected workflow, what outputs each step should produce, and how project-level metadata ties task specs together.

Workflow state records per-spec progress (linked workflow id, last completed step, optional step lifecycle metadata, interruption). Step sequences resolve from `workflow.config.json` workflows referenced by set lists — not from hard-coded tier names. The engine integrates `step_init` and `step_finalize` for built-in automatic steps while agents use the same boundaries via MCP.

Workflow definitions may register versioned manifesto declarations and ordered global references, while step definitions add ordered refinements. Each lifecycle attempt persists global-then-step resolution provenance and load outcomes before hooks or skill execution can proceed.

Project metadata and workflow config are read and written through validated paths with atomic JSON persistence. Built-in step output manifests support partial-completion detection without embedding agent or CLI concerns.
