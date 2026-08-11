# TypeScript SDK Source

## Purpose

This directory contains process-independent TypeScript model-generation behavior and its immutable input and output models.

## Conventions

- Do not depend on CLI, npm lifecycle, root Atlas, or process-output APIs.
- Return portable model values and leave filesystem output ownership to callers.

## Contents

- `TypeScriptModelGenerationRequest.ts` describes one workspace analysis request.
- `TypeScriptModelGenerationSdk.ts` defines the SDK generation boundary.
- `CompilerTypeScriptModelGenerationSdk.ts` implements compiler-backed analysis.
- `TypeScriptModuleModel.ts` defines the portable module document.
- `TypeScriptModelGenerationResult.ts` contains generated models without I/O.
