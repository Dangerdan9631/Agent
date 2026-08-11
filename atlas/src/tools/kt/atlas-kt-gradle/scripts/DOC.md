# Kotlin Gradle Wrapper Scripts

## Purpose

This directory contains the process adapter used by root npm commands to invoke
the Kotlin toolkit's pinned Gradle wrapper.

## Conventions

- Resolve paths relative to the toolkit or explicitly selected project.
- Forward process exit codes without embedding Gradle task behavior.
- Keep Gradle configuration in build scripts and plugin classes.

## Contents

- `RunGradle.mjs` selects a project and launches its Gradle wrapper.
