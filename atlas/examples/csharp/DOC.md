# Atlas C# Reading-List Example

## Purpose

This maintained reference workspace demonstrates the C# SDK, CLI, and MSBuild
integration with a two-module reading-list command-line application.

## Conventions

- `App` depends on `Lib`; the library never depends on the executable.
- Both modules use FluentValidation and each uses one distinct direct dependency.
- Each source project configures one target-specific model through the imported MSBuild integration.

## Contents

- `src/lib/` owns `ReadingListItem` and `ReadingList`.
- `src/app/` owns `ReadingListCommand` and `Program`.

## Commands

Run `dotnet build Atlas.Example.slnx`; each project build writes its own configured model.
