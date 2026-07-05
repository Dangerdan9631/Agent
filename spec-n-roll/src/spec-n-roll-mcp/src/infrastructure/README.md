# MCP infrastructure layer - src/spec-n-roll-mcp/src/infrastructure

This directory contains concrete adapters for MCP command execution. It implements application boundaries using process or framework-specific details.

## Conventions

### Adapter isolation

Keep external protocol and process details behind infrastructure classes. Application contracts should remain transport-neutral.
