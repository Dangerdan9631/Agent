# Layout Application Ports

## Purpose

This directory declares workflow boundaries used by the presentation layer to request deterministic scoped layouts.

## Conventions

- Workflows accept fully parsed layout settings rather than command-line values.
- Implementations return validation outcomes even when policy errors prevent layout persistence.

## Contents

- `ArchitectureLayoutWorkflow.ts` defines validation-aware scoped layout execution.
