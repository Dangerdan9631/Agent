# Dispatcher filesystem infrastructure - src/spec-n-roll/src/infrastructure/filesystem

This directory contains Node-backed raw filesystem adapters for the dispatcher. It converts filesystem failures into the narrow results defined by application ports.

## Conventions

### I/O only

Do not parse package metadata or construct shared API contracts here. Return raw text and existence values for application services to interpret.
