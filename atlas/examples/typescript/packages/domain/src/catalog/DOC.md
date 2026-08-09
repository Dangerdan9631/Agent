# Catalog domain

## Purpose

This directory models valid catalog items and the policies that create them.

## Conventions

- Keep item identity and title normalization deterministic.
- Add a subclass only when it supplies genuinely distinct behavior.
- Keep platform and serialization concerns outside the domain.

## Contents

- `CatalogItem.ts` defines common abstract item behavior.
- `BookCatalogItem.ts` and `WorkshopCatalogItem.ts` provide concrete specializations.
- `CatalogItemFactory.ts` creates specializations from drafts.
- The remaining files demonstrate domain interfaces, enum and type identities, constants, and a top-level normalization function.
