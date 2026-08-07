# Application Kotlin source

## Purpose

This directory contains the executable Kotlin artifact that consumes the catalog artifact through Gradle project dependency metadata. It formats a parsed product for user-facing output.

## Conventions

- Depend on catalog types through `dev.atlas.example.catalog`.
- Keep application-specific collection and text formatting at this boundary.
- Use `ApplicationMain` as the executable composition root.

## Contents

- `ApplicationMain.kt` runs the catalog demonstration.
