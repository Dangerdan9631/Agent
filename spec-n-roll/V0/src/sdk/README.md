# SDK

Programmatic boundary for Spec-N-Roll toolkit behavior. Domain types, orchestration, and file mutations live here so CLI, MCP, and Ink remain thin adapters.

Subdirectories mirror functional areas: `core/` for artifact mutations, `workflow/` for engine state, `repository/` for living-spec workflows, `agents/` for extension loading, and top-level modules such as `init.ts` and `update.ts` for high-level operations.
