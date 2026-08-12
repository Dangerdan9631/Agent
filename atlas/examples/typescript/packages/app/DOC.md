# TypeScript Example Application Package

## Purpose

This directory defines the executable reading-list package for the TypeScript
example workspace.

## Conventions

- Depend on `@atlas-example/lib` through its public package exports.
- Keep command composition and application-only dependencies in this package.
- Keep package-local implementation beneath `src`.

## Contents

- `package.json` defines the executable package and workspace scripts.
- `tsconfig.json` selects only this package's compiler source set for Atlas.
- `src/` contains the program and reading-list command.
