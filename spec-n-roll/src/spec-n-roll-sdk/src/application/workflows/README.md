# SDK workflow application domain

This directory contains transport-independent workflow acceptance behavior. It validates immutable public definitions before transition and hook processing receives them, without performing step execution or translating neutral skills into agent-native artifacts.

## Conventions

### Boundary validation

Return structured acceptance results with all independently detectable issues. Keep validation free of I/O and preserve the accepted definition by reference so downstream state remains immutable.
