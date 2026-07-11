# Dispatcher environment domain - src/spec-n-roll/src/application/environment

This directory contains application ports for dispatcher process context. These contracts let dispatcher behavior consume process values without depending on Node globals.

## Conventions

### Environment boundaries

Keep environment values as simple primitives. Infrastructure adapters own direct access to the running process.
