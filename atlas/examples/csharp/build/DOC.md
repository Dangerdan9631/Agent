# C# Example Architecture Build

## Purpose

This directory contains the single orchestration project that opts into the
Atlas MSBuild hook after all example and verification binaries are built.

## Conventions

- Keep `AtlasGenerateOnBuild` scoped to this project.
- Delegate generation and diagram behavior to the shipped targets and tools.
- Run verification only after final diagram generation succeeds.

## Contents

- `Atlas.Example.Architecture.csproj` composes build, Atlas, and verification targets.

