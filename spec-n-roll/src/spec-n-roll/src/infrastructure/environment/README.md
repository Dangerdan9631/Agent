# Dispatcher environment domain - src/spec-n-roll/src/infrastructure/environment

This directory contains process-environment adapters for dispatcher execution context. It isolates access to argv, cwd, and environment values.

## Conventions

### Environment access

Implement application environment ports through narrow adapter classes. Do not spread direct process global access into application behavior.
