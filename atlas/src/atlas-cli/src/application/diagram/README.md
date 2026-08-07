# Diagram Application Domain

## Purpose

This directory projects semantic declaration graphs into deterministic diagram scopes for artifact generation.

## Conventions

- Projection is graph-only; filesystem and HTML details remain infrastructure concerns.
- Module and package diagrams include local declarations and only directly connected external declarations.
- Presentation groups select module IDs without changing canonical artifact identities.

## Contents

- `DiagramProjectionService.ts` produces landscape, module, group, and folder diagram graphs.
- `model/` contains scope-specific graph documents.
- `ports/` defines artifact persistence.
