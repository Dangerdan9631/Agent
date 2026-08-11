# Kotlin Gradle Plugin Tests

## Purpose

This directory contains functional coverage for Gradle task registration,
multi-project generation, KSP fragment consumption, and manifest aggregation.

## Conventions

Use Gradle TestKit projects and assert the resulting YAML contracts rather than
depending on plugin implementation details.
