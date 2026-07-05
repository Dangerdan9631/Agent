# Dispatcher CLI domain - src/spec-n-roll/src/presentation/cli

This directory contains the dispatcher command-line adapter. It owns CLI command shape without owning dispatch behavior.

## Conventions

### CLI shape

Keep commander configuration and option mapping here. Do not add project resolution, metadata, or process execution behavior to CLI classes.
