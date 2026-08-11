# Kotlin Plugin Sources

## Purpose

This source tree implements the `dev.atlas.kotlin` Gradle plugin. It converts Kotlin source declarations into portable Atlas module-model YAML and orchestrates manifest generation.

The root viewer task carries the generated manifest through to Atlas desktop, preserving language-neutral regeneration after interactive configuration changes.

## Conventions

Keep Gradle APIs at this boundary and keep generated documents language-neutral. New target-specific integrations should contribute focused task or extractor types rather than altering shared model semantics.
