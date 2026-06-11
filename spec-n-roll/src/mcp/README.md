# MCP

Model Context Protocol server for agent-driven deterministic mutations. This layer exposes core library operations as MCP tools over stdio transport so coding agents can update workflow state without direct file edits.

The MCP server is a project-local binary installed at `.spec-n-roll/cli/bin/spec-n-roll-mcp`. It delegates all machine-readable writes to the shared core library, mirroring CLI subcommands for parity.
