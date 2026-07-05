# Test support composition layer - src/spec-n-roll-test/src/composition

This directory contains dependency wiring for test-support utilities. It connects reusable helpers to concrete command runners.

## Conventions

### Composition only

Keep dependency construction here. Do not add assertion logic or process execution behavior to composition classes.
