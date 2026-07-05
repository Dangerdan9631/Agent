# Dispatcher composition layer - src/spec-n-roll/src/composition

This directory contains dependency wiring for the dispatcher package. It connects application services to concrete infrastructure and presentation adapters.

## Conventions

### Composition only

Keep constructors and dependency registration here. Do not add business decisions or process I/O behavior to composition classes.
