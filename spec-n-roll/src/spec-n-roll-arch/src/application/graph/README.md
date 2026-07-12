# Architecture graph domain - src/spec-n-roll-arch/src/application/graph

This directory contains graph models and conversion behavior used by architecture artifacts. It turns dependency data into Cytoscape-ready application models and resolves public package entrypoint dependencies to the source files that back exported symbols.

## Conventions

### Graph conversion

Keep graph semantics and filtering behavior here. Rendering and file writing belong in infrastructure.

### Public API resolution

Project-level dependency graphs should show the files that own imported public API symbols, not the package `src/index.ts` files that re-export them. Keep fallback behavior conservative when an import shape cannot be mapped safely.

### External dependencies

Use `ExternalDependencyIdentifier` to classify npm and Node.js core modules consistently across package-level and project-level converters. Configured collapsed modules use `external:<name>` ids; configured landscape splits use `external:<name>:<source-package>` ids. External nodes use the `externalDependency: 'true'` data flag so the HTML viewer can style and toggle them.

Apply project dependency exclusions before pruning disconnected nodes. Retain connected node parent hierarchies so package and directory grouping remains intact.

### Viewer navigation

`ArchitecturePage` models the always-expanded navigation tree shared by graph and matrix artifacts. Group entries describe structure while leaf entries link to generated diagram or dependency-matrix pages.
