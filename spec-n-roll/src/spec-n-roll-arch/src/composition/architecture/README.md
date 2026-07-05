# Architecture composition domain - src/spec-n-roll-arch/src/composition/architecture

This directory contains the architecture program factory. It creates the command program used by the package entry point.

## Conventions

### Program wiring

Keep command creation focused on assembling existing behavior. Add new workflow decisions to application domains instead.
