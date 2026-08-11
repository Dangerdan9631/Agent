# Atlas C# MSBuild Package Assets

## Purpose

This directory contains the conventional NuGet `build/` asset imported by
projects that reference the Atlas C# MSBuild integration package.

## Conventions

- Keep generation opt-in and disabled during ordinary builds by default.
- Expose command and path properties so consumers can select local or installed tools.

## Contents

- `StarCruiseStudios.Atlas.Cs.MSBuild.targets` defines model, validation, diagram, and viewer targets.
