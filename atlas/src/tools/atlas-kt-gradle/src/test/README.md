# Kotlin Plugin Tests

## Purpose

This test tree verifies the Gradle plugin through TestKit builds rather than only compiling plugin classes.

## Conventions

Use isolated temporary Gradle projects and assert portable JSON artifacts. Cover behavior visible to plugin users, including multi-project aggregation and task lifecycle hooks.
