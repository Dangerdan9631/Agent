# Infrastructure source

## Purpose

This directory implements application ports with concrete parsing, persistence, and time adapters.

## Conventions

- Keep third-party dependencies inside adapter implementations.
- Translate external data into domain-owned drafts at the boundary.
- Preserve deterministic behavior so generated examples are reproducible.

## Contents

- `catalog` contains JSON seed, in-memory repository, and fixed-clock adapters.
- `index.ts` publishes concrete adapters for the composition root.
