# Catalog domain

## Purpose

This directory models valid Kotlin catalog items and the policies that create them.

## Conventions

- Keep item identity and title normalization deterministic.
- Add a subclass only when it supplies genuinely distinct behavior.
- Keep platform and serialization concerns outside the domain.

## Contents

- `CatalogItem.kt` defines common abstract item behavior.
- `BookCatalogItem.kt` and `WorkshopCatalogItem.kt` provide concrete specializations.
- `CatalogItemFactory.kt` creates specializations from drafts.
- The remaining files demonstrate interfaces, enum and type identities, data classes, constants, and a top-level normalization function.
