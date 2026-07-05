# Architecture CLI domain - src/spec-n-roll-arch/src/presentation/cli

This directory contains the architecture command-line adapter. It owns CLI startup behavior for architecture workflows.

## Conventions

### CLI shape

Keep command parsing and startup behavior focused. Do not mix dependency analysis, graph conversion, or artifact writing into CLI classes.
