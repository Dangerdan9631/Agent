# Atlas C# Clean-Architecture Example

## Purpose

This runnable solution demonstrates compiler-resolved C# models, source-generated
documents, cross-project linking, architecture validation, and diagram generation.

## Conventions

- Dependencies point inward from delivery and adapters to application and domain.
- The ordinary solution build remains independent of Atlas.
- The architecture project opts into the MSBuild hook and verifies persisted artifacts.

## Contents

- `src/` contains domain, application, infrastructure, and app projects.
- `build/` contains the designated Atlas orchestration project.
- `verification/` validates generated model and diagram contracts.

## Commands

Run `dotnet build Atlas.Example.slnx`, then build `build/Atlas.Example.Architecture.csproj`
to generate, validate, and verify the complete Atlas output.

