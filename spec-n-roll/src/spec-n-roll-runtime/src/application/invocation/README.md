# Runtime invocation domain - src/spec-n-roll-runtime/src/application/invocation

This directory contains invocation reading contracts and parsing behavior. It turns dispatcher-provided payloads into runtime application inputs.

## Conventions

### Invocation handling

Keep payload parsing and validation here. Direct stdin access should remain in process infrastructure adapters.
