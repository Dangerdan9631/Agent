# Diagram Application Domain

## Purpose

This directory projects semantic declaration graphs into deterministic diagram scopes for artifact generation.

## Conventions

- Projection is graph-only; filesystem and HTML details remain infrastructure concerns.
- Package diagrams include local declarations and only directly connected external declarations.

## Contents

- `DiagramProjectionService.ts` produces landscape and package diagram graphs.
- `model/` contains scope-specific graph documents.
- `ports/` defines artifact persistence.
