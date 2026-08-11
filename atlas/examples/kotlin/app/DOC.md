# Kotlin Example Application Module

## Purpose

This directory defines the executable reading-list application module for the
Kotlin example workspace.

## Conventions

- Depend on the reusable `lib` module through its public types.
- Keep command composition and application-only dependencies in this module.
- Place production Kotlin sources beneath `src/main/kotlin`.

## Contents

- `build.gradle.kts` defines application dependencies and the executable entry point.
- `src/` contains the program and reading-list command.
