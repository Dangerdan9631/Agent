# Atlas C# MSBuild Package Assets

## Purpose

This directory contains the conventional NuGet `build/` asset imported by
projects that reference the Atlas C# MSBuild integration package.

## Conventions

- Generate only the current evaluated project target and never search for solutions or projects.
- Expose command and model-path properties so consumers can select local or installed tools.

## Contents

- `StarCruiseStudios.Atlas.Cs.MSBuild.targets` generates the current target's configured model after its build.
