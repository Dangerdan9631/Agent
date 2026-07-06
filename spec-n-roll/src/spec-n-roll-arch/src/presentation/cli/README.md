# Architecture CLI domain - src/spec-n-roll-arch/src/presentation/cli

This directory contains the architecture command-line adapter. It owns CLI startup behavior for architecture generation and local viewer workflows.

## Conventions

### CLI shape

Keep command parsing and startup behavior focused. Do not mix dependency analysis, graph conversion, artifact writing, or layout persistence into CLI classes.
