# Test support infrastructure layer - src/spec-n-roll-test/src/infrastructure

This directory contains concrete adapters for test-support process execution. It implements test helper boundaries using Node process facilities.

## Conventions

### Adapter isolation

Keep process spawning and command execution mechanics here. Higher-level tests should use application contracts and exported helpers.
