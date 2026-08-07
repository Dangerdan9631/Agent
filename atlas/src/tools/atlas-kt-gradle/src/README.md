# Kotlin Plugin Sources

## Purpose

This source tree implements the `dev.atlas.kotlin` Gradle plugin. It converts Kotlin JVM source declarations into portable Atlas module-model JSON and orchestrates manifest generation.

## Conventions

Keep Gradle APIs at this boundary and keep generated documents language-neutral. New target-specific integrations should contribute focused task or extractor types rather than altering shared model semantics.
