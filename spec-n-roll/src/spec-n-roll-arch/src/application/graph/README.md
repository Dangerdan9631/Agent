# Architecture graph domain - src/spec-n-roll-arch/src/application/graph

This directory contains graph models and conversion behavior used by architecture artifacts. It turns dependency data into Cytoscape-ready application models and resolves public package entrypoint dependencies to the source files that back exported symbols.

## Conventions

### Graph conversion

Keep graph semantics and filtering behavior here. Rendering and file writing belong in infrastructure.

### Public API resolution

Project-level dependency graphs should show the files that own imported public API symbols, not the package `src/index.ts` files that re-export them. Keep fallback behavior conservative when an import shape cannot be mapped safely.

### External dependencies

Use `ExternalDependencyIdentifier` to classify npm and Node.js core modules consistently across package-level and project-level converters. External nodes use `external:<name>` ids and the `externalDependency: 'true'` data flag so the HTML viewer can style and toggle them.
