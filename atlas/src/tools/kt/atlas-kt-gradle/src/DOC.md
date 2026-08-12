# Kotlin Plugin Sources

## Purpose

This source tree implements the `dev.atlas.kotlin` Gradle plugin. It converts
each explicitly registered target compilation into one portable module-model YAML.

No root aggregation or viewer task is registered; project-level composition is
owned by the root `atlas.config.yml` and shared Atlas application.

## Conventions

Keep Gradle APIs at this boundary and keep generated documents language-neutral. New target-specific integrations should contribute focused task or extractor types rather than altering shared model semantics.
