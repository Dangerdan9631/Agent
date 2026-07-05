# Runtime output domain - src/spec-n-roll-runtime/src/application/output

This directory contains output boundaries for runtime results. It models user-facing output without owning stdout or stderr directly.

## Conventions

### Output boundary

Keep output contracts narrow and explicit. Concrete process writers belong in infrastructure.
