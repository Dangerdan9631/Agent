# Atlas C# MSBuild Integration

## Purpose

This package exposes workspace-wide Atlas generation, validation, diagram, and
view targets for one designated orchestration project.

## Conventions

- Keep the package free of application logic; it delegates to installed tools.
- Do not attach Atlas to ordinary builds unless `AtlasGenerateOnBuild` is true.
- Quote all user-provided paths passed across process boundaries.

## Contents

- `build/StarCruiseStudios.Atlas.Cs.MSBuild.targets` defines the public targets and properties.

