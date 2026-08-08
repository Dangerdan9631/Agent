# Catalog infrastructure

## Purpose

This directory adapts Jackson, Apache Commons, memory storage, and host time values to application ports.

## Conventions

- Validate untrusted seed documents before creating domain drafts.
- Return domain and application abstractions rather than vendor values.
- Keep ordering and timestamps deterministic in the example.

## Contents

- `JsonCatalogSeedReader.kt` validates the default JSON seed.
- `InMemoryCatalogRepository.kt` supplies ordered in-memory persistence.
- `FixedCatalogClock.kt` supplies a repeatable application timestamp.
