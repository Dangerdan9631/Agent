# Atlas Kotlin KSP Processor

## Purpose

This module packages the Kotlin Symbol Processing adapter that emits portable
semantic fragments for Kotlin model generation.

## Conventions

- Keep KSP APIs isolated from the Kotlin SDK and CLI contracts.
- Emit deterministic YAML fragments containing language-neutral semantic facts.
- Publish the processor provider through the standard service registration.

## Contents

- `build.gradle.kts` defines the processor dependencies and publication model.
- `src/` contains the processor implementation and service registration.
