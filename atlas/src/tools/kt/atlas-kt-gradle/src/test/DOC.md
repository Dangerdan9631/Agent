# Kotlin Plugin Tests

## Purpose

This test tree verifies the Gradle plugin through TestKit builds rather than only compiling plugin classes.

## Conventions

Use isolated temporary Gradle projects and parse the resulting portable YAML.
Cover behavior visible to plugin users, including multi-project aggregation,
nested declaration hierarchy, kind and relationship parity, module-relative
source paths, semantic-fragment consumption, subprocess classpaths, and task
lifecycle hooks.
