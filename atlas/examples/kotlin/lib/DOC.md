# Kotlin Example Library Module

## Purpose

This directory defines the reusable reading-list library module for the Kotlin
example workspace.

## Conventions

- Keep the module independent from the executable `app` module.
- Apply the shared Atlas Gradle and KSP integration configured by the workspace.
- Place production Kotlin sources beneath `src/main/kotlin`.

## Contents

- `build.gradle.kts` defines library dependencies and Atlas metadata.
- `src/` contains the reading-list domain implementation.
