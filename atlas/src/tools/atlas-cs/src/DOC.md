# Atlas C# Source

## Purpose

This directory contains the generator runtime and its build-system packaging.

## Conventions

- Keep the executable boundary separate from compiler and persistence behavior.
- Depend on local interfaces at filesystem, output, logging, and workspace boundaries.
- Use constructor injection and deterministic value objects throughout generation.

## Contents

- `Atlas.Cs/` is the compiler-backed .NET tool.
- `Atlas.Cs.MSBuild/` is the thin MSBuild integration package.

