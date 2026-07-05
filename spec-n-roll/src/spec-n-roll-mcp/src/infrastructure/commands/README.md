# MCP command infrastructure domain - src/spec-n-roll-mcp/src/infrastructure/commands

This directory contains concrete command-runner implementations for MCP execution. It adapts command boundaries to current package behavior.

## Conventions

### Command adapters

Keep execution mechanics here and expose them through the command boundary. Avoid leaking adapter details into composition consumers.
