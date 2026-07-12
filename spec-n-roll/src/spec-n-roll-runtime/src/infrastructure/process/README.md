# Runtime process domain - src/spec-n-roll-runtime/src/infrastructure/process

This directory contains process I/O adapters for runtime execution. It reads dispatcher payloads from the private process environment so stdin remains attached to the interactive terminal.

## Conventions

### Process I/O

Keep process global usage here and route diagnostics through logging. Do not add runtime orchestration behavior to these adapters.
