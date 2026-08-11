# TypeScript Generation Application

## Purpose

This directory coordinates workspace discovery, SDK analysis, and YAML artifact
output without exposing process details to the pure SDK.

## Conventions

- Workflows depend on the SDK interface or its injected implementation.
- Configuration parsing and filesystem writes remain outside the SDK.

## Contents

- `TypeScriptModelGenerationWorkflow.ts` defines the command-facing contract.
- `SdkTypeScriptModelGenerationWorkflow.ts` implements YAML-backed orchestration.
