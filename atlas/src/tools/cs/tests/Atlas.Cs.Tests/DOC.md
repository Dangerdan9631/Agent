# Atlas C# Tests

## Purpose

This project verifies the C# SDK's semantic model behavior and the CLI's
generation boundary.

## Conventions

- Test SDK behavior independently from MSBuild package wiring where practical.
- Use isolated temporary workspaces for generated files.
- Assert portable YAML contracts through public CLI and SDK behavior.

## Contents

- CLI tests cover command parsing and error reporting.
- Integration tests cover Roslyn extraction, model generation, and identity.
