# Core

Shared deterministic mutation layer for spec-n-roll. This layer is the single writer for machine-readable workflow artifacts such as workflow state, spec frontmatter, project metadata, and task checkboxes.

`step-lifecycle.ts` orchestrates `runStepInit` and `runStepFinalize`: ordered manifesto resolution and attempt provenance, hook instruction assembly, lifecycle gates, and completion eligibility. Required manifesto failures are persisted and block before hook or skill execution; optional failures remain non-blocking diagnostics.

CLI subcommands and the MCP server are thin interfaces over core operations. Living spec prose and agent-managed content remain outside this boundary.
