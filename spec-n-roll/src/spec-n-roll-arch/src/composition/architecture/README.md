# Architecture composition domain - src/spec-n-roll-arch/src/composition/architecture

This directory contains the architecture program factory. It creates the command program used by the package entry point for artifact generation and local diagram viewing.

## Conventions

### Program wiring

Keep command creation focused on assembling existing behavior. Add new workflow decisions to application or infrastructure domains instead.

### Viewer command

The `view` command should wire the local HTTP viewer to the generated architecture artifact directory. Keep request handling and layout persistence behavior in infrastructure rather than in Commander callbacks.
