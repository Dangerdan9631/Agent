# Dispatcher application layer - src/spec-n-roll/src/application

This directory contains dispatcher behavior that makes routing decisions independent of process and framework details. Domains in this layer model dispatch requests, project resolution, and runtime selection.

## Conventions

### Application boundaries

Keep dispatcher decisions in small classes that depend on local interfaces and shared API contracts. Infrastructure adapters should be injected rather than reached for directly.
