# Atlas C# Tests

## Purpose

This directory verifies C# compiler extraction, workspace generation, and
MSBuild packaging behavior.

## Conventions

- Use temporary workspaces for filesystem and MSBuild integration.
- Assert deterministic portable output rather than compiler object details.
- Keep fixtures small while covering each supported C# semantic category.

## Contents

- `Atlas.Cs.Tests/` contains unit and integration tests for the C# toolchain.

