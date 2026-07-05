# Runtime CLI domain - src/spec-n-roll-runtime/src/presentation/cli

This directory contains the runtime command-line adapter. It owns CLI startup shape for runtime execution.

## Conventions

### CLI shape

Keep command-line startup focused on composing and running the runtime program. Do not add invocation parsing or output writing logic here.
