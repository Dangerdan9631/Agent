# SDK infrastructure layer - src/spec-n-roll-sdk/src/infrastructure

This directory contains concrete SDK adapters for cross-cutting concerns. It supports SDK application behavior without depending on executable package layers.

## Conventions

### Adapter isolation

Keep concrete vendor or framework dependencies here. Application services should depend on local abstractions when variation appears.
