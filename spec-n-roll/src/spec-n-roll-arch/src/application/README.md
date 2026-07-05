# Architecture application layer - src/spec-n-roll-arch/src/application

This directory contains architecture workflow behavior that is independent of CLI and tool adapters. Domains model artifact generation, configuration, graph conversion, and package policy.

## Conventions

### Application boundaries

Keep architectural decisions in this layer and depend on local models. Tool execution and filesystem adapters belong in infrastructure.
