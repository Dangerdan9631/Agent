# Architecture graph domain - src/spec-n-roll-arch/src/application/graph

This directory contains graph models and conversion behavior used by architecture artifacts. It turns TypeScript declaration relationships into Cytoscape-ready application models while retaining dependency-cruiser models for validation compatibility.

## Conventions

### Graph conversion

Keep graph semantics and filtering behavior here. Declaration graphs model named top-level classes, interfaces, aliases, enums, and file-level module nodes; rendering and file writing belong in infrastructure.

### Relationship semantics

Use `reference` relationships for normal type and value use, and `inheritance` relationships for TypeScript `extends` and `implements` clauses. Renderers use this distinction to draw inheritance with dashed edges.

### Public API resolution

Project-level dependency graphs should show the files that own imported public API symbols, not the package `src/index.ts` files that re-export them. Keep fallback behavior conservative when an import shape cannot be mapped safely.

### External dependencies

Use `ExternalDependencyIdentifier` to classify npm and Node.js core modules consistently across package-level and project-level converters. Configured collapsed modules use `external:<name>` ids; configured landscape splits use `external:<name>:<source-package>` ids. External nodes use the `externalDependency: 'true'` data flag so the HTML viewer can style and toggle them.

Apply project dependency exclusions before pruning disconnected nodes. Retain connected node parent hierarchies so package and directory grouping remains intact.

### Viewer navigation

`ArchitecturePage` models the always-expanded navigation tree shared by graph and matrix artifacts. Group entries describe structure while leaf entries link to generated diagram or dependency-matrix pages.
