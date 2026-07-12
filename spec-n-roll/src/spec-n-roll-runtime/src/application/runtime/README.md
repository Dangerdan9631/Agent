# Runtime orchestration domain - src/spec-n-roll-runtime/src/application/runtime

This directory contains runtime application orchestration. It coordinates invocation parsing, direct commands, project state, and output boundaries to execute runtime behavior.

## Conventions

### Runtime behavior

Keep runtime decisions here and inject readers, parsers, and UI renderers. Avoid direct process global access in application classes.
