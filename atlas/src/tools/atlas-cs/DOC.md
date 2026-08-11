# Atlas C# Generator

## Purpose

This directory contains the compiler-backed C# source-model generator, its
MSBuild integration package, and focused tests. It emits the language-neutral
Atlas model contract consumed by `atlas-cli`.

## Conventions

- Keep MSBuild and Roslyn types behind focused adapters.
- Keep generated JSON deterministic and free of absolute paths.
- Run workspace-wide build integration from one designated orchestration project.

## Contents

- `src/Atlas.Cs/` contains the `atlas-cs` .NET tool.
- `src/Atlas.Cs.MSBuild/` packages opt-in MSBuild targets.
- `tests/Atlas.Cs.Tests/` verifies extraction, generation, and build integration.

