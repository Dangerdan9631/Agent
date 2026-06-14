# Core

Shared deterministic mutation layer for spec-n-roll. This layer is the single writer for machine-readable workflow artifacts such as workflow state, spec frontmatter, project metadata, and task checkboxes.

`step-lifecycle.ts` orchestrates `runStepInit` and `runStepFinalize`: manifesto loading, hook instruction assembly, lifecycle gates, and completion eligibility. CLI subcommands and MCP tools delegate to these functions for step boundaries.

CLI subcommands and the MCP server are thin interfaces over core operations. Living spec prose and agent-managed content remain outside this boundary.
