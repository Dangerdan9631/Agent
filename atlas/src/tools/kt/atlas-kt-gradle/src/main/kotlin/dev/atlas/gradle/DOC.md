# Atlas Gradle Integration

## Purpose

This package owns explicit per-target Gradle task registration, artifact identity,
semantic-fragment inputs, and isolated invocation of the standalone Kotlin model generator.

## Conventions

The plugin never applies itself to subprojects or enumerates targets. Each named
model supplies an exact target, compilation, output, and optional fragment inputs.
