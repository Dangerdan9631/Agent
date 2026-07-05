# MCP composition layer - src/spec-n-roll-mcp/src/composition

This directory contains dependency wiring for the MCP package. It connects presentation adapters to command implementations.

## Conventions

### Composition only

Keep concrete dependency construction here. Push command behavior and process details into their owning layers.
