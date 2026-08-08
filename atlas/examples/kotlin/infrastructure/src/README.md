# Infrastructure source tree

## Purpose

This source tree implements Kotlin application ports with concrete parsing, persistence, and time adapters.

## Conventions

- Keep third-party dependencies inside adapter implementations.
- Translate external data into domain-owned drafts at the boundary.
- Preserve deterministic behavior so generated examples are reproducible.

## Contents

- `main/kotlin/dev/atlas/example/infrastructure/catalog` contains JSON seed, in-memory repository, and fixed-clock adapters.
