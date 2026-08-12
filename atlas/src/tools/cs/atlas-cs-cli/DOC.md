# Atlas C# Runtime

## Purpose

This project accepts one exact SDK-style C# project target, extracts
compiler-resolved architecture facts, and persists its portable Atlas model.
Legacy workspace generation remains isolated from the MSBuild path.

## Conventions

- Register MSBuild before loading any workspace APIs.
- Attribute relationships to the smallest emitted declaration owner.
- Normalize every source and generated path relative to its owning module.

## Contents

- `Application/` coordinates generation.
- `Configuration/` loads and validates Atlas policy.
- `Infrastructure/` adapts Roslyn, MSBuild, persistence, logging, and output.
- `Model/` contains portable and generator-internal values.
- `Presentation/` implements the command boundary.
