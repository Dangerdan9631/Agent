# Atlas Kotlin SDK

## Purpose

This module owns process-independent Kotlin source analysis and portable Atlas
model construction.

## Conventions

- Keep Gradle, KSP, command-line, and persistence APIs outside the SDK boundary.
- Accept explicit request values and return portable model values.
- Keep source identities and generated relationships deterministic.

## Contents

- `build.gradle.kts` defines the library and compiler dependencies.
- `src/main` contains source extraction and model-generation behavior.
- `src/test` contains SDK-focused verification.
