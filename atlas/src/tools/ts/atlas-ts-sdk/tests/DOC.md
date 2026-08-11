# TypeScript SDK Tests

## Purpose

This directory verifies compiler-backed TypeScript model generation independently
from CLI, npm, filesystem-output, and root Atlas behavior.

## Conventions

- Exercise the SDK through its public request and result contracts.
- Use isolated source fixtures and deterministic identity assertions.
- Keep process and integration coverage in the owning adapter packages.

## Contents

- `CompilerTypeScriptModelGenerationSdk.test.ts` covers source extraction and
  portable relationship generation.
