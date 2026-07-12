# Project update application contracts

This directory defines transport-neutral capabilities for replacing framework-owned project files and migrating persisted project configuration. Implementations receive filesystem and package-layout details through narrow injected boundaries.

## Conventions

### Ownership

Framework ownership is explicit at extension boundaries. Updaters must preserve files that are not identified as framework-owned so user customizations survive framework updates.
