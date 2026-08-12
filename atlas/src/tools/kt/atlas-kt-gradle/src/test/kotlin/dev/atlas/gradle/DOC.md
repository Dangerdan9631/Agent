# Kotlin Gradle Plugin Tests

## Purpose

This directory contains functional coverage for Gradle task registration,
explicit target generation and module-local semantic-fragment inputs.

## Conventions

Use Gradle TestKit projects and assert the resulting YAML contracts rather than
depending on plugin implementation details.
