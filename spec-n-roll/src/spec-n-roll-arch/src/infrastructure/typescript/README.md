# TypeScript infrastructure - src/spec-n-roll-arch/src/infrastructure/typescript

This directory adapts TypeScript source files into architecture declaration graphs. It owns syntax-tree traversal and source import resolution while keeping graph rendering independent from TypeScript APIs.

## Conventions

Declaration readers return named top-level declarations and file-level module nodes. They classify heritage clauses as inheritance and other resolved source uses as references.
