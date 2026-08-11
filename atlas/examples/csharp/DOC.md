# Atlas C# Reading-List Example

## Purpose

This maintained reference workspace demonstrates the C# SDK, CLI, and MSBuild
integration with a two-module reading-list command-line application.

## Conventions

- `App` depends on `Lib`; the library never depends on the executable.
- Both modules use FluentValidation and each uses one distinct direct dependency.
- The build-only project owns Atlas generation, validation, and viewer targets.

## Contents

- `src/lib/` owns `ReadingListItem` and `ReadingList`.
- `src/app/` owns `ReadingListCommand` and `Program`.
- `build/` contains the designated Atlas MSBuild orchestration project.

## Commands

Run `dotnet build Atlas.Example.slnx` for the application or
`dotnet build build/Atlas.Example.csproj --target:AtlasGenerate` for Atlas output.
