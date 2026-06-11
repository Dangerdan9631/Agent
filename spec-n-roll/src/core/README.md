# Core

Shared deterministic mutation layer for spec-n-roll. This layer is the single writer for machine-readable workflow artifacts such as workflow state, spec frontmatter, project metadata, and task checkboxes.

CLI subcommands and the MCP server are thin interfaces over these operations. Living spec prose and agent-managed content remain outside this boundary.
