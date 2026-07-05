# Dispatcher dispatch domain - src/spec-n-roll/src/application/dispatch

This directory contains the dispatcher request model and orchestration behavior. It coordinates project and runtime collaborators without owning their implementation details.

## Conventions

### Dispatch behavior

Keep command intent, run options, and orchestration decisions together. Push filesystem, metadata, and process execution details into injected collaborators.
