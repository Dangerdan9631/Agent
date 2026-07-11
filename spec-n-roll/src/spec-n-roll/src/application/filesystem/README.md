# Dispatcher filesystem domain - src/spec-n-roll/src/application/filesystem

This directory contains the application port for raw dispatcher filesystem access. Application services depend on this narrow contract instead of Node filesystem APIs.

## Conventions

### Raw values

Return paths, booleans, and text only. Application services own path policy and parsing; infrastructure implementations own I/O failures.
