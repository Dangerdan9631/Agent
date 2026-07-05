# Runtime composition domain - src/spec-n-roll-runtime/src/composition/runtime

This directory contains runtime-specific composition roots and program factories. It creates executable runtime programs from application and infrastructure components.

## Conventions

### Runtime wiring

Wire concrete process adapters against application boundaries here. Keep constructors simple and side-effect free.
