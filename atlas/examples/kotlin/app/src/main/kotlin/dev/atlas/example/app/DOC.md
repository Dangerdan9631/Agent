# Delivery Kotlin source

## Purpose

This directory contains the executable Kotlin artifact that composes domain, application, and infrastructure modules and formats imported catalog items for user-facing output.

## Conventions

- Depend on inner modules through their published package namespaces.
- Keep delivery-specific collection and text formatting at this boundary.
- Use `ApplicationMain` as the executable composition root.

## Contents

- `CatalogApplication.kt` assembles concrete adapters and use cases.
- `ApplicationCatalogService.kt` exposes the use cases needed by delivery.
- `CatalogDemo.kt` renders the deterministic catalog through `RuntimeOutputWriter.kt`.
- `ApplicationMain.kt` starts the catalog demonstration.
