# Runtime presentation layer - src/spec-n-roll-runtime/src/presentation

This directory contains CLI and Ink adapters for runtime commands. It translates executable startup into composed runtime behavior and owns the interactive terminal presentation.

## Conventions

### Presentation adapters

Keep CLI framework concerns here. Delegate parsing and execution decisions to runtime application classes.
