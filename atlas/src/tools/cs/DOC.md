# C# Tools

## Purpose

This directory contains the pure Roslyn analysis SDK, command-line generator,
and opt-in MSBuild integration as separately built projects.

## Conventions

- `atlas-cs-sdk` accepts compiler documents and produces portable model values.
- `atlas-cs-cli` owns MSBuild evaluation, process I/O, configuration, and YAML output.
- `atlas-cs-msbuild` contains task wiring only and delegates generation to the CLI.

## Contents

- `atlas-cs-sdk/` contains process-independent semantic analysis.
- `atlas-cs-cli/` contains the `atlas-cs` .NET tool.
- `atlas-cs-msbuild/` packages opt-in MSBuild targets.
- `tests/` verifies extraction, generation, and command behavior.
