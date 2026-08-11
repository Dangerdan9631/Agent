# Kotlin Gradle Wrapper

## Purpose

This directory contains the pinned Gradle wrapper assets used to build and test
the Kotlin toolkit independently from a system Gradle installation.

## Conventions

- Update wrapper files through Gradle's wrapper task.
- Keep the pinned distribution version consistent across toolkit automation.
- Do not place plugin or model-generation behavior in this directory.

## Contents

- `wrapper/` contains the launcher JAR and distribution properties.
