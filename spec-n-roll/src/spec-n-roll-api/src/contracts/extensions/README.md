# Extension contracts domain - src/spec-n-roll-api/src/contracts/extensions

This directory contains transport-neutral contracts for project extensions. The contracts describe agent skill inputs, MCP configuration behavior, and the persisted enabled-state configuration without loading extensions or accessing the filesystem.

## Conventions

### Extension boundaries

Keep these declarations independent of a specific agent, runtime, or file format. Implementations and JSON parsing belong to the package that owns those operational concerns.
