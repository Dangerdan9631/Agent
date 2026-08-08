# Catalog infrastructure

## Purpose

This directory adapts JSON, Zod, Lodash, memory storage, and host time values to application ports.

## Conventions

- Validate untrusted seed documents before creating domain drafts.
- Return domain and application abstractions rather than vendor values.
- Keep ordering and timestamps deterministic in the example.

## Contents

- `JsonCatalogSeedReader.ts` validates the default JSON seed.
- `InMemoryCatalogRepository.ts` supplies ordered in-memory persistence.
- `FixedCatalogClock.ts` supplies a repeatable application timestamp.
