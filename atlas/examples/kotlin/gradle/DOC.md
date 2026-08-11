# Kotlin Example Gradle Wrapper

## Purpose

This directory contains the pinned Gradle wrapper assets used to build the
Kotlin reference workspace independently from a system Gradle installation.

## Conventions

- Update wrapper files through Gradle's wrapper task.
- Keep the distribution version compatible with the Atlas Kotlin plugin build.
- Keep application and plugin configuration in the workspace build scripts.

## Contents

- `wrapper/` contains the launcher JAR and distribution properties.
