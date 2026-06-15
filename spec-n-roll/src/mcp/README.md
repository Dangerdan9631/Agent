# MCP

Model Context Protocol server for agent-driven deterministic mutations. This layer exposes core library operations as MCP tools over stdio transport so coding agents can update workflow state, run step lifecycle boundaries, and manage set lists without direct file edits.

Registered tools include workflow state read/write, task status and checkbox updates, project metadata, `step_init` / `step_finalize`, step template instantiation, spec frontmatter updates, and `set_list_read` / `set_list_triage`.

Repository workflow tools delegate to `src/repository/` through shared CLI loaders: `repository_workflow_types_list`, `repository_workflow_start`, `repository_workflow_plan`, `repository_workflow_drift_run`, and `repository_workflow_report_read`. MCP payloads use the same field names and JSON shapes as matching `repository-workflow` CLI subcommands.

The MCP server is a project-local binary installed at `.spec-n-roll/cli/bin/spec-n-roll-mcp`. It delegates all machine-readable writes to the shared core library, mirroring CLI subcommands for parity.
