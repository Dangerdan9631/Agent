# Catalog application

## Purpose

This directory coordinates catalog domain behavior without selecting concrete adapters.

## Conventions

- Express external needs as narrow interfaces.
- Keep use cases independent of JSON, terminal, and storage libraries.
- Validate application-specific limits before querying ports.

## Contents

- `ImportCatalog.ts` imports seed drafts through domain construction.
- `CatalogQueryService.ts` exposes bounded catalog reads.
- Port and report files define the use cases' stable boundary.
