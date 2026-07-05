# Architecture composition layer - src/spec-n-roll-arch/src/composition

This directory contains dependency wiring for architecture workflows. It connects CLI adapters to architecture application behavior.

## Conventions

### Composition only

Keep dependency construction and assembly here. Avoid adding artifact, config, or graph decisions to composition classes.
