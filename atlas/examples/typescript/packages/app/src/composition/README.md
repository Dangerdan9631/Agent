# Composition source

## Purpose

This directory owns concrete construction for the executable TypeScript catalog.

## Conventions

- Instantiate adapters only at this outer boundary.
- Pass dependencies inward through constructors.
- Keep business decisions in domain or application types.

## Contents

- `CatalogApplication.ts` assembles and runs the default catalog workflow.
