# Runtime application layer - src/spec-n-roll-runtime/src/application

This directory contains runtime behavior independent of process I/O adapters. Domains model invocation parsing, output boundaries, and runtime orchestration.

## Conventions

### Application boundaries

Keep command execution decisions in application classes and depend on local interfaces. Process stdin and stdout access belongs in infrastructure.
