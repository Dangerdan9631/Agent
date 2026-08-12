# TypeScript Generation Application

## Purpose

This directory coordinates SDK analysis and deterministic version-two YAML
artifact output without exposing process details to the pure SDK.

## Conventions

- Workflows depend on the SDK interface or its injected implementation.
- Configuration parsing and filesystem writes remain outside the SDK.

## Contents

- `TypeScriptModelGenerationWorkflow.ts` defines the command-facing contract.
- `SdkTypeScriptModelGenerationWorkflow.ts` reads one package's `atlas` mapping and writes its configured model.
- `VersionTwoTypeScriptModelDocument.ts` maps SDK facts to the generated schema.
