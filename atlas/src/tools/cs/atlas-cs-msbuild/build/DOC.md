# Atlas C# MSBuild Package Assets

## Purpose

This directory contains the conventional NuGet `build/` asset imported by
projects that reference the Atlas C# MSBuild integration package.

## Conventions

- Generate only the current evaluated project target and never search for solutions or projects.
- Expose command and model-path properties so consumers can select local or installed tools.

## Contents

- `StarCruiseStudios.Atlas.Cs.MSBuild.targets` derives the current target's model filename beneath the configured artifact root after its build.
