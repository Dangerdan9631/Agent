# Architecture infrastructure layer - src/spec-n-roll-arch/src/infrastructure

This directory contains concrete adapters for dependency analysis, workspace reads, and artifact writing. It implements the boundaries consumed by architecture application code.

## Conventions

### Adapter isolation

Keep vendor output formats and filesystem writes in this layer. Application code should use local models and injected collaborators.
