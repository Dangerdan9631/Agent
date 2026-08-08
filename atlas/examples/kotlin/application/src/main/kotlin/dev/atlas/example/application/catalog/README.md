# Catalog application

## Purpose

This directory coordinates Kotlin catalog domain behavior without selecting concrete adapters.

## Conventions

- Express external needs as narrow interfaces.
- Keep use cases independent of JSON, terminal, and storage libraries.
- Validate application-specific limits before querying ports.

## Contents

- `ImportCatalog.kt` imports seed drafts through domain construction.
- `CatalogQueryService.kt` exposes bounded catalog reads.
- Port and report files define the use cases' stable boundary.
