# Workflow

File-backed workflow state and artifact expectations for specification-driven development. This layer tracks where a task spec is in its tier, what outputs each step should produce, and how project-level metadata ties task specs together.

Workflow state records per-spec progress (variant, last completed step, interruption). Project metadata and workflow config are read and written through validated paths with atomic JSON persistence. Built-in step output manifests and default tier step sequences support partial-completion detection and variant resolution without embedding agent or CLI concerns.
