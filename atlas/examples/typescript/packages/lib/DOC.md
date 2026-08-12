# TypeScript Example Library Package

## Purpose

This directory defines the reusable reading-list package for the TypeScript
example workspace.

## Conventions

- Keep the package independent from the executable `app` package.
- Export only the public reading-list behavior declared by the package manifest.
- Keep package-local implementation beneath `src`.

## Contents

- `package.json` defines the workspace package, dependencies, and exports.
- `tsconfig.json` selects only this package's compiler source set for Atlas.
- `src/` contains the reading-list types and behavior.
