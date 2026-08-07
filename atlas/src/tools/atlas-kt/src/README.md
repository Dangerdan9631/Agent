# Atlas Kotlin CLI Source

## Purpose

This directory implements the standalone Kotlin module-model generator. It
accepts source roots and artifact identity from a build adapter and writes only
the portable Atlas JSON contracts.

## Conventions

Source extraction remains independent of Gradle APIs. Gradle-specific identity,
task, and process concerns belong in `atlas-kt-gradle`.
