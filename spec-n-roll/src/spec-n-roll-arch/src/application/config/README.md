# Architecture config domain - src/spec-n-roll-arch/src/application/config

This directory contains architecture configuration models, readers, and filters. It owns configuration decisions that shape generated dependency views.

Landscape dependency splitting assigns a separate external graph node to each configured importing workspace package while preserving the dependency's displayed name.

## Conventions

### Configuration behavior

Keep config interpretation, collapse decisions, and exclusion decisions here. Filesystem mechanics should remain isolated from policy decisions.

### Layout ownership

Do not model diagram layout as architecture configuration. Layout is persisted automatically by the local viewer in checked-in `*.layout.json` files next to generated diagrams.
