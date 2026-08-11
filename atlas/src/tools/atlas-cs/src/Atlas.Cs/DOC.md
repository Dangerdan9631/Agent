# Atlas C# Runtime

## Purpose

This project discovers SDK-style C# artifacts, extracts compiler-resolved
architecture facts, and persists portable Atlas models.

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

