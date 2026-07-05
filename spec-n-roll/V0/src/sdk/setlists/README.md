# Set Lists

Configurable workflow-selection entries that replace hard-coded complexity triage. Each set list names a workflow, carries natural-language description text for agent triage, a numeric priority for tie-breaking when intent is ambiguous, and an enabled flag to exclude entries from evaluation.

This module owns the schema, persistence, CRUD, validation against `workflow.config.json`, and triage evaluation for `.spec-n-roll/config/set-lists.json`. Fresh projects receive papercut, quick, and full as ordinary data rows seeded at init; runtime code must not branch on those ids except in seed data and tests.

CLI, MCP, and Ink management surfaces call into this module so triage, listing, and mutation behavior stay consistent across agent and human entry points.
