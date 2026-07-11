# Dispatcher runtime infrastructure - src/spec-n-roll/src/infrastructure/runtime

This directory contains concrete runtime process execution adapters. It translates raw runtime process requests into Node process launches.

## Conventions

### Process execution

Keep child-process and environment construction details here. Application code should continue to depend on the runtime executor boundary.
