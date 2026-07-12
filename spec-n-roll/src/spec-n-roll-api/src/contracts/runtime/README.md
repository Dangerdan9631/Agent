# Runtime contracts domain - src/spec-n-roll-api/src/contracts/runtime

This directory contains shared runtime target and invocation payload contracts. These contracts describe how dispatcher and runtime packages exchange invocation data.

## Conventions

### Runtime vocabulary

Keep payload fields stable and documented. Invocation payloads identify both the
dispatcher and the resolved runtime so presentation can accurately show the
active installation without re-resolving package state.
