# Test support command infrastructure domain - src/spec-n-roll-test/src/infrastructure/commands

This directory contains concrete command-runner implementations for tests. It adapts command helper contracts to process execution.

## Conventions

### Command execution

Keep process execution details here and expose them through the command-runner interface. Avoid embedding package-specific assertions in runners.
