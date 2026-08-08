# Validation Models

## Purpose

This directory contains immutable results from dependency analysis and rule evaluation.

## Conventions

- Source and resolved target paths are slash-normalized and workspace-relative or module-local.
- Federated relationships retain opaque module IDs so equal module-local paths remain unambiguous.
- An unresolved target remains explicit instead of being guessed.

## Contents

- `DependencyRelationship.ts` represents one directed import relationship.
- `DependencyAnalysisResult.ts` groups relationships for one package.
- `ArchitectureViolation.ts` represents one actionable rule failure.
- `ValidationCommandResult.ts` groups workspace, analysis, and policy outcomes for one command.
