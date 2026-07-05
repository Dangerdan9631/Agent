# MCP application layer - src/spec-n-roll-mcp/src/application

This directory contains MCP package behavior independent of process adapters and composition. Domains model command execution boundaries for protocol-facing behavior.

## Conventions

### Application boundaries

Keep MCP behavior behind narrow interfaces. Concrete command and protocol adapters belong in infrastructure.
