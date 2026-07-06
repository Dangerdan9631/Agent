# Architecture infrastructure layer - src/spec-n-roll-arch/src/infrastructure

This directory contains concrete adapters for dependency analysis, workspace reads, artifact writing, and local diagram serving. It implements the boundaries consumed by architecture application and CLI composition code.

## Conventions

### Adapter isolation

Keep vendor output formats, HTTP request handling, and filesystem writes in this layer. Application code should use local models and injected collaborators.

### Layout persistence

The local viewer server owns writes to checked-in diagram layout files. Cytoscape artifact writing should render browser behavior, while HTTP infrastructure should validate paths and persist layout JSON.
