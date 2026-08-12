# Atlas C# MSBuild Integration

## Purpose

This package generates one Atlas model for the current evaluated C# project
target without searching for solutions or invoking project-level Atlas behavior.

## Conventions

- Keep the package free of application logic; it delegates to installed tools.
- Attach only the current target when `AtlasGenerateOnBuild` is true.
- Quote all user-provided paths passed across process boundaries.

## Contents

- `build/StarCruiseStudios.Atlas.Cs.MSBuild.targets` defines the public targets and properties.
