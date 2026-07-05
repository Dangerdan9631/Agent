# Runtime infrastructure layer - src/spec-n-roll-runtime/src/infrastructure

This directory contains concrete adapters for process input and output. It isolates Node process APIs from runtime application behavior.

## Conventions

### Adapter isolation

Keep stdin, stdout, and stderr access in this layer. Application code should depend on invocation and output interfaces.
