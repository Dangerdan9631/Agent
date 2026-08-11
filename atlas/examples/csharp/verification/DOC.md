# C# Example Verification

## Purpose

This project validates the persisted portable models, diagram index, graphs,
and layouts produced by the C# example.

## Conventions

- Verify exact scopes and representative semantic facts.
- Treat generated artifacts as untrusted JSON input.
- Keep verification deterministic and independent of viewer implementation details.

## Contents

- `Program.cs` contains the executable verification boundary and focused nested validators.

